function Admin({ user }) {
  return (
    <section className="role-page" aria-labelledby="role-title">
      <p className="eyebrow">Administrator</p>
      <h1 id="role-title">Welcome, {user.name}</h1>
      <p className="role-page-copy">Admin dashboard</p>
    </section>
  );
}

export default Admin;
