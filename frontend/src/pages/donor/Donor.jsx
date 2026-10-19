function Donor({ user }) {
  return (
    <section className="role-page" aria-labelledby="role-title">
      <p className="eyebrow">Donor</p>
      <h1 id="role-title">Welcome, {user.name}</h1>
      <p className="role-page-copy">Donor dashboard</p>
    </section>
  );
}

export default Donor;
