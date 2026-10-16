function Verifier({ user }) {
  return (
    <section className="role-page" aria-labelledby="role-title">
      <p className="eyebrow">Verifier</p>
      <h1 id="role-title">Welcome, {user.name}</h1>
      <p className="role-page-copy">Verifier dashboard</p>
    </section>
  );
}

export default Verifier;
