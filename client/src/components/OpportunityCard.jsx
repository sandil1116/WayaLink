
function OpportunityCard({ title, category, description, date }) {
  return (
    <article className="opportunity-card">
      <span className="opportunity-tag">
        {category}
      </span>

      <h3>{title}</h3>

      <p>{description}</p>

      <p className="opportunity-date">
        📅 {date}
      </p>
    </article>
  );
}

export default OpportunityCard;
