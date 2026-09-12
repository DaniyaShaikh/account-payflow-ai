/**
 * Prototype session flag. No authentication is performed — this only decides
 * whether the login screen is shown as the first screen of the session.
 */
const KEY = "payflow-signed-in";

export function markSignedIn() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* storage unavailable — treat as signed in for this session */
  }
}

export function isSignedIn() {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}
