export function getAll(local = false) {
	try {
		return JSON.parse((local ? localStorage : sessionStorage).hidden);
	} catch (err) {
		return {};
	}
}

export function get(key, def, local = false)  {
	var s = getAll(local);
	return s.hasOwnProperty(key) ? s[key] : def;
}

export function set(key, val, local = false) {
	var s = getAll(local);
	s[key] = val;
	(local ? localStorage : sessionStorage).hidden = JSON.stringify(s);
}
