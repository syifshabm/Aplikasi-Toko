import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import prisma from "../../lib/prisma";
import { Lucia } from "lucia";
import { StringDecoder } from "string_decoder";
import { RoleUser } from "@/generated/prisma";
import { cookies } from "next/headers";
import { cache } from "react";

const adapter = new PrismaAdapter(prisma.session, prisma.user)

export const lucia = new Lucia(adapter, {
    sessionCookie: {
        expires: false,
        attributes: {
            secure: process.env.NODE_ENV === "production"
        }
    },
    getUserAttributes: (attributes) => {
        return {
            id: attributes.id,
            name: attributes.name,
            email: attributes.email,
            role: attributes.role,
        }
    }
})

export const getUser = cache(async () => {
	const cookieStore = await cookies();
	const sessionId = cookieStore.get(lucia.sessionCookieName)?.value ?? null;
	if (!sessionId) return null;

	const { user, session } = await lucia.validateSession(sessionId);

	try {
		if (session && session.fresh) {
			const sessionCookie = lucia.createSessionCookie(session.id);
			cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
		}
		if (!session) {
			const sessionCookie = lucia.createBlankSessionCookie();
			cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
		}
	} catch {
		// Next.js throws error when attempting to set cookies when rendering page
	}

	return user;
});

declare module "lucia" {
	interface Register {
		Lucia: typeof lucia;
        UserId: number;
        DatabaseUserAttributes: {
            id: number
            name: string
            email: string
            role: RoleUser
        }
	}
}