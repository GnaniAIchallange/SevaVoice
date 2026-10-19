function Farmer({ user }) {
  return (
    <section className="role-page" aria-labelledby="role-title">
      <p className="eyebrow">Farmer</p>
      <h1 id="role-title">Welcome, {user.name}</h1>
      <p className="role-page-copy">Farmer dashboard</p>
    </section>
  );
}

export default Farmer;
