export const enterAlt = () => process.stdout.write("\x1b[?1049h\x1b[?25l\x1b[2J\x1b[H");
export const exitAlt = () => process.stdout.write("\x1b[?25h\x1b[?1049l");
