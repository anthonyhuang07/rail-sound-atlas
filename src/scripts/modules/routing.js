export const buildRouteHash = (route) => {
  if (route.view === "country" && route.countryId) return `#/${route.countryId}`;
  if (route.view === "system" && route.countryId && route.systemId) {
    return `#/${route.countryId}/${route.systemId}${route.soundId ? `?sound=${encodeURIComponent(route.soundId)}` : ""}`;
  }
  return "#/";
}; // URL Route Format

export const parseRouteHash = () => {
  const raw = (window.location.hash || "#/").replace(/^#/, "");
  const [path, query] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  if (!parts.length) return { view: "home" };
  if (parts.length === 1) return { view: "country", countryId: parts[0] };
  return { view: "system", countryId: parts[0], systemId: parts[1], soundId: new URLSearchParams(query).get("sound") };
};

export const pushRoute = (route, replace = false) => {
  const method = replace ? "replaceState" : "pushState";
  history[method](route, "", buildRouteHash(route));
};
