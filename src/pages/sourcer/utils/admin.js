// export const isAdmin = (u) => {
//   if (!u) return false;
//   // support both shapes: array of role strings, or user.role string
//   const roles = Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []);
//   return roles.includes('admin');
// };

// export const pickOrdersEndpoint = (user) =>
//   isAdmin(user) ? '/api/v1/sourcing/all-sourcing' : '/api/v1/sourcing/mine';



// src/pages/utils/admin.js

/**
 * Return true if the user has an "admin" role in any of the common shapes:
 *  - user.role === "admin"
 *  - user.roles is an array of strings or objects with .name === "admin"
 *  - user.roles is a single string/object (not array)
 */
export const isAdmin = (user) => {
  if (!user) return false;

  // 1) Simple "role" string
  const roleStr = (user.role || "").toString().toLowerCase();
  if (roleStr === "admin") return true;

  // 2) "roles" can be many shapes
  const rolesRaw = user.roles;

  // 2a) Array of strings or objects
  if (Array.isArray(rolesRaw)) {
    return rolesRaw.some((r) => {
      // if r is a string like "admin"
      if (typeof r === "string") return r.toLowerCase() === "admin";
      // if r is an object like { name: "admin", ... }
      if (r && typeof r === "object") {
        const name = (r.name || r.role || "").toString().toLowerCase();
        return name === "admin";
      }
      // if r is an ObjectId (or random value), we can't decide here
      return false;
    });
  }

  // 2b) Single non-array value (e.g., ObjectId or single string)
  if (rolesRaw) {
    // If it's a string and equals "admin"
    if (typeof rolesRaw === "string" && rolesRaw.toLowerCase() === "admin") {
      return true;
    }
    // If it's an object with "name" or "role" field populated
    if (typeof rolesRaw === "object") {
      const name = (rolesRaw.name || rolesRaw.role || "").toString().toLowerCase();
      if (name === "admin") return true;
    }
    // Otherwise it's likely an ObjectId; we can't infer client-side.
    // Fall through to "false" and let the backend enforce.
  }

  return false;
};

/**
 * Choose endpoint based on role. Even if this guesses wrong,
 * the backend still enforces via requireRoles().
 */
export const pickOrdersEndpoint = (user) =>
  isAdmin(user) ? "/api/v1/sourcing/all-sourcing" : "/api/v1/sourcing/mine";
