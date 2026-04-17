import nodemailer from 'nodemailer';

function getTransporter() {
	const user = process.env.EMAIL_USER;
	const pass = process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD;

	if (!user || !pass) {
		return null;
	}

	return nodemailer.createTransport({
		service: 'gmail',
		auth: { user, pass },
	});
}

export async function sendEmail({ to, subject, text, html }) {
	const transporter = getTransporter();
	if (!transporter) {
		return { skipped: true };
	}

	const from = process.env.EMAIL_USER;
	const mail = {
		from: `CampusConnect <${from}>`,
		to,
		subject,
		text,
		html,
	};

	const info = await transporter.sendMail(mail);
	return { skipped: false, messageId: info.messageId };
}
