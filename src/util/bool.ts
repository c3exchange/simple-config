export const toBool = (value: string): boolean | undefined => {
	value = value.toLowerCase();
	if (value == '0' || value == 'off' || value == 'false' || value == 'f' || value == 'no' || value == 'n') {
		return false;
	}
	if (value == '1' || value == 'on' || value == 'true' || value == 't' || value == 'yes' || value == 'y') {
		return true;
	}
	return undefined;
};
