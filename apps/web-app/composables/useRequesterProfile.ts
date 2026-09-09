const STORAGE_KEY = "bb-requester-profile";

export type RequesterProfile = {
  name: string;
  phone: string;
};

function readProfile(): RequesterProfile {
  if (!import.meta.client) return { name: "", phone: "" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { name: "", phone: "" };
    const parsed = JSON.parse(raw) as Partial<RequesterProfile>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
    };
  } catch {
    return { name: "", phone: "" };
  }
}

function writeProfile(profile: RequesterProfile) {
  if (!import.meta.client) return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      name: profile.name.trim(),
      phone: profile.phone.trim(),
    })
  );
}

/** Remember requester name/phone across SOS and order forms (local device only). */
export function useRequesterProfile() {
  const name = ref("");
  const phone = ref("");

  function load() {
    const saved = readProfile();
    name.value = saved.name;
    phone.value = saved.phone;
  }

  function save(nextName = name.value, nextPhone = phone.value) {
    const profile = {
      name: nextName.trim(),
      phone: nextPhone.trim(),
    };
    if (!profile.name || !profile.phone) return;
    writeProfile(profile);
    name.value = profile.name;
    phone.value = profile.phone;
  }

  function clear() {
    if (import.meta.client) localStorage.removeItem(STORAGE_KEY);
    name.value = "";
    phone.value = "";
  }

  return { name, phone, load, save, clear };
}
