
function Categories() {
  const categories = [
    {
      name: "Events",
      description: "University activities and experiences"
    },
    {
      name: "Internships",
      description: "Career development opportunities"
    },
    {
    name: "Hackathons",
    description: "Compete, innovate and build"
    },
    {
    name: "Workshops",
    description: "Learn new skills and grow"
    }

  ];

  return (
    <section className="categories">
      <h2>Explore Opportunities</h2>
      <p>
        Discover opportunities that match your interests.
      </p>

      <div className="category-grid">
        {categories.map((category) => (
          <div className="category-card" key={category.name}>
            <h3>{category.name}</h3>
            <p>{category.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Categories;
