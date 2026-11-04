
const StudentPreference = require("../models/StudentPreference");
const Opportunity = require("../models/Opportunity");

const CATEGORIES = [
  "Workshop",
  "Hackathon",
  "Internship",
  "Event"
];

function normalizeList(value, maxItems = 12) {
  if (!Array.isArray(value) || value.length > maxItems) {
    return null;
  }

  if (
    value.some(
      (item) =>
        typeof item !== "string" ||
        item.length > 50
    )
  ) {
    return null;
  }

  return [
    ...new Set(
      value
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  ];
}

function formatPreferences(document) {
  return {
    interests: document?.interests || [],
    skills: document?.skills || [],
    preferredCategories:
      document?.preferredCategories || [],
    careerGoal: document?.careerGoal || ""
  };
}

// GET /api/recommendations/preferences
const getPreferences = async (req, res) => {
  try {
    const preferences =
      await StudentPreference.findOne({
        student: req.user._id
      }).lean();

    return res.json({
      preferences: formatPreferences(preferences)
    });
  } catch (error) {
    console.error("Preferences error:", error.message);

    return res.status(500).json({
      message: "Could not load preferences"
    });
  }
};

// PUT /api/recommendations/preferences
const updatePreferences = async (req, res) => {
  try {
    const {
      interests,
      skills,
      preferredCategories,
      careerGoal
    } = req.body || {};

    const cleanInterests = normalizeList(interests);
    const cleanSkills = normalizeList(skills);
    const cleanCategories =
      normalizeList(preferredCategories, 4);

    if (
      !cleanInterests ||
      !cleanSkills ||
      !cleanCategories ||
      typeof careerGoal !== "string" ||
      careerGoal.length > 300
    ) {
      return res.status(400).json({
        message: "Invalid student preferences"
      });
    }

    if (
      cleanCategories.some(
        (category) =>
          !CATEGORIES.some(
            (allowed) =>
              allowed.toLowerCase() === category
          )
      )
    ) {
      return res.status(400).json({
        message: "Invalid opportunity category"
      });
    }

    const normalizedCategories =
      cleanCategories.map(
        (category) =>
          CATEGORIES.find(
            (allowed) =>
              allowed.toLowerCase() === category
          )
      );

    const preferences =
      await StudentPreference.findOneAndUpdate(
        { student: req.user._id },
        {
          $set: {
            interests: cleanInterests,
            skills: cleanSkills,
            preferredCategories:
              normalizedCategories,
            careerGoal: careerGoal.trim()
          }
        },
        {
          new: true,
          upsert: true,
          runValidators: true
        }
      );

    return res.json({
      message: "Preferences saved successfully",
      preferences: formatPreferences(preferences)
    });
  } catch (error) {
    console.error("Preferences save error:", error.message);

    return res.status(500).json({
      message: "Could not save preferences"
    });
  }
};

// Match complete words and phrases rather than
// arbitrary substrings.
function containsTerm(text, term) {
  if (!term) return false;

  const escaped = term.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const pattern = new RegExp(
    `(^|[^a-z0-9])${escaped}($|[^a-z0-9])`,
    "i"
  );

  return pattern.test(text);
}

function scoreOpportunity(opportunity, preferences) {
  const title = String(
    opportunity.title || ""
  );

  const description = String(
    opportunity.description || ""
  );

  const category = String(
    opportunity.category || ""
  );

  let score = 0;
  const reasons = [];

  for (const interest of preferences.interests) {
    if (
      containsTerm(title, interest) ||
      containsTerm(description, interest)
    ) {
      score += 5;
      reasons.push(`Matches your interest: ${interest}`);
    }
  }

  for (const skill of preferences.skills) {
    if (
      containsTerm(title, skill) ||
      containsTerm(description, skill)
    ) {
      score += 4;
      reasons.push(`Mentions your skill: ${skill}`);
    }
  }

  if (
    preferences.preferredCategories.includes(
      category
    )
  ) {
    score += 3;
    reasons.push(`Preferred category: ${category}`);
  }

  // Career goal contributes only through explicit
  // meaningful terms found in the opportunity.
  const goalTerms = [
    ...new Set(
      preferences.careerGoal
        .toLowerCase()
        .match(/[a-z0-9]+/g) || []
    )
  ].filter(
    (word) =>
      word.length >= 5 &&
      ![
        "career",
        "become",
        "would",
        "student",
        "working",
        "interested"
      ].includes(word)
  );

  const goalMatched = goalTerms.some(
    (word) =>
      containsTerm(title, word) ||
      containsTerm(description, word)
  );

  if (goalMatched) {
    score += 2;
    reasons.push("Related to your career goal");
  }

  return { score, reasons };
}

// GET /api/recommendations/me
const getRecommendations = async (req, res) => {
  try {
    const preferences =
      await StudentPreference.findOne({
        student: req.user._id
      }).lean();

    if (!preferences) {
      return res.json({
        profileComplete: false,
        recommendations: [],
        message:
          "Set up your interests and skills to receive recommendations."
      });
    }

    const profile = formatPreferences(preferences);

    const hasPreferences =
      profile.interests.length > 0 ||
      profile.skills.length > 0 ||
      profile.preferredCategories.length > 0 ||
      Boolean(profile.careerGoal.trim());

    if (!hasPreferences) {
      return res.json({
        profileComplete: false,
        recommendations: [],
        message:
          "Add at least one preference to get started."
      });
    }

    const opportunities = await Opportunity.find({})
      .select("title description category date createdAt")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const recommendations = opportunities
      .map((opportunity) => ({
        opportunity,
        ...scoreOpportunity(
          opportunity,
          profile
        )
      }))
      .filter((item) => item.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          new Date(b.opportunity.createdAt || 0) -
            new Date(a.opportunity.createdAt || 0)
      )
      .slice(0, 12)
      .map((item) => ({
        id: String(item.opportunity._id),
        title: item.opportunity.title,
        description:
          item.opportunity.description,
        category: item.opportunity.category,
        date: item.opportunity.date,
        score: item.score,
        matchLevel:
          item.score >= 10
            ? "Strong match"
            : item.score >= 5
              ? "Good match"
              : "Potential match",
        reasons: item.reasons,
        url:
          `/opportunities/${item.opportunity._id}`
      }));

    return res.json({
      profileComplete: true,
      recommendations,
      message:
        recommendations.length > 0
          ? "Personalized recommendations generated"
          : "No matching opportunities found yet."
    });
  } catch (error) {
    console.error(
      "Recommendation error:",
      error.message
    );

    return res.status(500).json({
      message:
        "Could not generate recommendations"
    });
  }
};

module.exports = {
  getPreferences,
  updatePreferences,
  getRecommendations
};
