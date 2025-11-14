import fs from 'fs';

const envPath = 'src/.env.local';

if (!fs.existsSync(envPath)) {
	process.exit(0);
}

const envContents = fs.readFileSync(envPath, 'utf8');

if (!envContents.trim()) {
	process.exit(0);
}

// Exit cleanly when only blank lines or comment lines (prefixed by #) are present
const onlyBlankOrCommentLines = envContents
	.split(/\r?\n/)
	.every((line) => {
		const trimmed = line.trim();
		return !trimmed || trimmed.startsWith('#');
	});

if (onlyBlankOrCommentLines) {
	process.exit(0);
}

throw new Error('checks-prod: src/.env.local is not empty');
