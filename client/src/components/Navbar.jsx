
function Navbar() {
  return (
    <nav className="navbar">
      <h2>WayaLink</h2>

      <div className="nav-links">
        <a href="/">Home</a>
        <a href="/login">Login</a>
        <span>Events</span>
        <span>Clubs</span>
        <span className="login-btn">Login</span>
      </div>
    </nav>
  );
}

export default Navbar;
