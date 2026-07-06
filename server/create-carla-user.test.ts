import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";
import { hashPassword } from "./auth";

describe("Create Carla Massing User", () => {
  it("should create carla.massing user with warnings module only", async () => {
    // Delete if exists
    try {
      const existing = await db.getUserByEmail("carla.massing");
      if (existing) {
        await db.deleteUserById(existing.id);
      }
    } catch (e) {
      // Ignore
    }

    // Create user
    const hashedPassword = await hashPassword("Carla@2026");
    console.log("Creating user with password hash:", hashedPassword.substring(0, 20) + "...");
    const userData = {
      email: "carla.massing",
      name: "Carla Massing",
      password: hashedPassword,
      role: "gestor",
      modules: JSON.stringify(["controle_de_advertencias"]),
      status: "ativo",
      loginMethod: "email",
    };
    console.log("User data:", userData);
    const userId = await db.createUser(userData);
    console.log("Created userId:", userId);

    expect(userId).toBeDefined();
    expect(typeof userId).toBe("number");

    // Verify user was created
    const user = await db.getUserByEmail("carla.massing");
    expect(user).toBeDefined();
    expect(user?.email).toBe("carla.massing");
    expect(user?.name).toBe("Carla Massing");
    expect(user?.role).toBe("gestor");
    expect(user?.status).toBe("ativo");

    // Verify modules
    const modules = user?.modules ? JSON.parse(user.modules) : [];
    expect(modules).toContain("controle_de_advertencias");
    expect(modules.length).toBe(1);

    console.log("✅ User carla.massing created successfully");
    console.log(`Email: ${user?.email}`);
    console.log(`Role: ${user?.role}`);
    console.log(`Modules: ${modules.join(", ")}`);
    console.log(`Password: Carla@2026`);
  });
});
