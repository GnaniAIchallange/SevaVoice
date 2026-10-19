function RouteLink({ to, onNavigate, className, children }) {
  return (
    <a
      className={className}
      href={to}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        event.preventDefault();
        onNavigate(to);
      }}
    >
      {children}
    </a>
  );
}

export default RouteLink;
