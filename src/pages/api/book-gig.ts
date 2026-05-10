import type { APIRoute } from "astro";
import { contacts, notes } from "@wix/crm";
import { AppStrategy, createClient } from "@wix/sdk";

export const prerender = false;

type BookingPayload = {
	name: 		string;
	email: 		string;
	eventDate: 	string;
	message: 	string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//A helper function for crafting a browser-standard Response object,
//with a JSON text.
const jsonResponse = (body: Record<string, unknown>, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
		},
	});

//A helper function for reading an Astro/Vite enviroment variable.
const getEnv = (key: string) => {
	const value = import.meta.env[key];

	if (!value) {
		throw new Error(`Missing required environment variable: ${key}`);
	}

	return value;
};

const getField = (formData: FormData, key: string) => {
	const value = formData.get(key);
	return typeof value === "string" ? value.trim() : "";
};

const isValidDate = (value: string) => {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}

	const date = new Date(`${value}T00:00:00.000Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

const parseBookingPayload = async (request: Request): Promise<BookingPayload | null> => {
	const formData = await request.formData();
	const payload = {
		name: getField(formData, "name"),
		email: getField(formData, "email").toLowerCase(),
		eventDate: getField(formData, "event-date"),
		message: getField(formData, "message"),
	};

	if (
		!payload.name ||
		!payload.email ||
		!payload.eventDate ||
		!payload.message ||
		!emailPattern.test(payload.email) ||
		!isValidDate(payload.eventDate)
	) {
		return null;
	}

	return payload;
};

//Wix Contacts expect a first and last names, but the form has one field. 
//So here we split the name ("John Smith") into first and last.
const splitName = (name: string) => {
	const [first, ...rest] = name.split(/\s+/);

	return {
		first,
		last: rest.join(" ") || undefined,
	};
};

//Create an authenticated Wix SDK client that the endpoint can use to call
//the Wix CRM. Credentials are taken from .env.local. 
//modules test the SDK which Wix APIs we want available on this client.
const createWixClient = () =>
	createClient({
		auth: AppStrategy({
			appId: getEnv("WIX_CLIENT_ID"),
			appSecret: getEnv("WIX_CLIENT_SECRET"),
			instanceId: getEnv("WIX_CLIENT_INSTANCE_ID"),
		}),
		modules: {
			contacts,
			notes,
		},
	});

//Looks for an existing Wix contact with the submitted email address.
//We only ask for one matching result, because we don't need anything else.
//If no contact is found - result.items[0] is undefined.	
const findContactByEmail = async (wixClient: ReturnType<typeof createWixClient>, email: string) => {
	const result = await wixClient.contacts
		.queryContacts()
		.eq("primaryInfo.email", email)
		.limit(1)
		.find();

	return result.items[0];
};


const createBookingNoteText = ({ name, email, eventDate, message }: BookingPayload) =>
	[
		"Booking request",
		"",
		`Name: ${name}`,
		`Email: ${email}`,
		`Event date: ${eventDate}`,
		"",
		"Message:",
		message,
	].join("\n");


export const POST: APIRoute = async ({ request }) => {
	const payload = await parseBookingPayload(request);

	if (!payload) {
		return jsonResponse({ ok: false, error: "missing_or_invalid_fields" }, 400);
	}

	try {
		const wixClient = createWixClient();
		const existingContact = await findContactByEmail(wixClient, payload.email);

		//If the CRM already has a contact with the same email - use it, else
		//create a new contact.
		const contact =
			existingContact ??
			(
				await wixClient.contacts.createContact({
					name: splitName(payload.name),
					emails: {
						items: [
							{
								email: payload.email,
								primary: true,
								tag: "MAIN",
							},
						],
					},
				})
			).contact;
		const contactId = contact?._id;

		if (!contactId) {
			throw new Error("Wix contact response did not include a contact ID.");
		}

		await wixClient.notes.createNote({
			contactId,
			text: createBookingNoteText(payload),
			type: "NOT_SET",
		});

		return jsonResponse({ ok: true });
	} catch (error) {
		console.error("Failed to process booking request", error);
		return jsonResponse({ ok: false, error: "booking_request_failed" }, 500);
	}
};
