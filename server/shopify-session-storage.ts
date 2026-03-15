import { Session } from "@shopify/shopify-api";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { shopifySessions } from "@shared/schema.ts";

export class PostgresSessionStorage {
  async storeSession(session: Session): Promise<boolean> {
    try {
      const sessionData = {
        id: session.id,
        shop: session.shop,
        state: session.state || null,
        isOnline: session.isOnline,
        scope: session.scope || null,
        expires: session.expires ? new Date(session.expires) : null,
        accessToken: session.accessToken || null,
        onlineAccessInfo: session.onlineAccessInfo
          ? JSON.stringify(session.onlineAccessInfo)
          : null,
      };

      await db
        .insert(shopifySessions)
        .values(sessionData)
        .onConflictDoUpdate({
          target: shopifySessions.id,
          set: sessionData,
        });

      return true;
    } catch (error) {
      console.error("Failed to store session:", error);
      return false;
    }
  }

  async loadSession(id: string): Promise<Session | undefined> {
    try {
      const [row] = await db
        .select()
        .from(shopifySessions)
        .where(eq(shopifySessions.id, id));

      if (!row) return undefined;

      const session = new Session({
        id: row.id,
        shop: row.shop,
        state: row.state || "",
        isOnline: row.isOnline || false,
      });

      if (row.scope) session.scope = row.scope;
      if (row.expires) session.expires = new Date(row.expires);
      if (row.accessToken) session.accessToken = row.accessToken;
      if (row.onlineAccessInfo) {
        session.onlineAccessInfo = JSON.parse(row.onlineAccessInfo);
      }

      return session;
    } catch (error) {
      console.error("Failed to load session:", error);
      return undefined;
    }
  }

  async deleteSession(id: string): Promise<boolean> {
    try {
      await db
        .delete(shopifySessions)
        .where(eq(shopifySessions.id, id));
      return true;
    } catch (error) {
      console.error("Failed to delete session:", error);
      return false;
    }
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    try {
      for (const id of ids) {
        await db
          .delete(shopifySessions)
          .where(eq(shopifySessions.id, id));
      }
      return true;
    } catch (error) {
      console.error("Failed to delete sessions:", error);
      return false;
    }
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    try {
      const rows = await db
        .select()
        .from(shopifySessions)
        .where(eq(shopifySessions.shop, shop));

      return rows.map((row) => {
        const session = new Session({
          id: row.id,
          shop: row.shop,
          state: row.state || "",
          isOnline: row.isOnline || false,
        });

        if (row.scope) session.scope = row.scope;
        if (row.expires) session.expires = new Date(row.expires);
        if (row.accessToken) session.accessToken = row.accessToken;
        if (row.onlineAccessInfo) {
          session.onlineAccessInfo = JSON.parse(row.onlineAccessInfo);
        }

        return session;
      });
    } catch (error) {
      console.error("Failed to find sessions:", error);
      return [];
    }
  }
}

export const sessionStorage = new PostgresSessionStorage();
