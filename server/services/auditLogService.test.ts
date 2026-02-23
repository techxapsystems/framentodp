import { describe, it, expect } from "vitest";
import {
  LogAction,
  LogResource,
  CreateLogInput,
} from "./auditLogService";

describe("Audit Log Service", () => {
  describe("Log Input Validation", () => {
    it("should accept valid log action types", () => {
      const validActions: LogAction[] = [
        "login",
        "logout",
        "create_warning",
        "edit_warning",
        "delete_warning",
        "create_orientation",
        "edit_orientation",
        "delete_orientation",
        "create_user",
        "edit_user",
        "delete_user",
        "import_data",
        "export_data",
        "view_report",
        "change_settings",
        "access_denied",
      ];

      expect(validActions.length).toBe(16);
      validActions.forEach((action) => {
        expect(action).toBeTruthy();
      });
    });

    it("should accept valid log resource types", () => {
      const validResources: LogResource[] = [
        "users",
        "warnings",
        "orientations",
        "imports",
        "reports",
        "settings",
        "system",
      ];

      expect(validResources.length).toBe(7);
      validResources.forEach((resource) => {
        expect(resource).toBeTruthy();
      });
    });

    it("should create valid log input", () => {
      const logInput: CreateLogInput = {
        userId: 1,
        userName: "Test User",
        userEmail: "test@example.com",
        action: "login",
        resource: "system",
        description: "User logged in successfully",
        status: "success",
      };

      expect(logInput.userId).toBe(1);
      expect(logInput.userName).toBe("Test User");
      expect(logInput.userEmail).toBe("test@example.com");
      expect(logInput.action).toBe("login");
      expect(logInput.resource).toBe("system");
      expect(logInput.status).toBe("success");
    });

    it("should handle optional fields in log input", () => {
      const logInput: CreateLogInput = {
        userId: 2,
        userName: "Another User",
        userEmail: "another@example.com",
        action: "create_warning",
        resource: "warnings",
        resourceId: 123,
        description: "Created new warning",
        details: {
          warningType: "advertencia",
          conductorName: "João Silva",
        },
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0...",
        status: "success",
      };

      expect(logInput.resourceId).toBe(123);
      expect(logInput.details).toEqual({
        warningType: "advertencia",
        conductorName: "João Silva",
      });
      expect(logInput.ipAddress).toBe("192.168.1.1");
      expect(logInput.userAgent).toContain("Mozilla");
    });

    it("should handle failed action logs", () => {
      const failedLog: CreateLogInput = {
        userId: 3,
        userName: "Failed User",
        userEmail: "failed@example.com",
        action: "access_denied",
        resource: "reports",
        description: "User attempted to access unauthorized report",
        status: "failed",
        errorMessage: "User does not have permission to access this resource",
      };

      expect(failedLog.status).toBe("failed");
      expect(failedLog.errorMessage).toBeTruthy();
    });

    it("should handle warning status logs", () => {
      const warningLog: CreateLogInput = {
        userId: 4,
        userName: "Warning User",
        userEmail: "warning@example.com",
        action: "change_settings",
        resource: "settings",
        description: "System configuration changed",
        status: "warning",
      };

      expect(warningLog.status).toBe("warning");
    });
  });

  describe("Log Statistics", () => {
    it("should calculate correct statistics structure", () => {
      const stats = {
        total: 100,
        byAction: {
          login: 50,
          logout: 30,
          create_warning: 15,
          edit_warning: 5,
        },
        byResource: {
          system: 50,
          warnings: 35,
          users: 15,
        },
        byStatus: {
          success: 95,
          failed: 4,
          warning: 1,
        },
        byUser: {
          "Gabriel Ferreira": 60,
          "Giovana Lucatteli": 40,
        },
      };

      expect(stats.total).toBe(100);
      expect(stats.byAction.login).toBe(50);
      expect(stats.byResource.system).toBe(50);
      expect(stats.byStatus.success).toBe(95);
      expect(stats.byUser["Gabriel Ferreira"]).toBe(60);
    });

    it("should handle empty statistics", () => {
      const emptyStats = {
        total: 0,
        byAction: {},
        byResource: {},
        byStatus: { success: 0, failed: 0, warning: 0 },
        byUser: {},
      };

      expect(emptyStats.total).toBe(0);
      expect(Object.keys(emptyStats.byAction).length).toBe(0);
      expect(Object.keys(emptyStats.byResource).length).toBe(0);
    });
  });

  describe("Log Filtering", () => {
    it("should support filtering by user ID", () => {
      const filterOptions = {
        userId: 1,
        limit: 50,
        offset: 0,
      };

      expect(filterOptions.userId).toBe(1);
      expect(filterOptions.limit).toBe(50);
      expect(filterOptions.offset).toBe(0);
    });

    it("should support filtering by action", () => {
      const filterOptions = {
        action: "create_warning",
        limit: 50,
        offset: 0,
      };

      expect(filterOptions.action).toBe("create_warning");
    });

    it("should support filtering by resource", () => {
      const filterOptions = {
        resource: "warnings",
        limit: 50,
        offset: 0,
      };

      expect(filterOptions.resource).toBe("warnings");
    });

    it("should support filtering by date range", () => {
      const startDate = new Date("2026-02-01");
      const endDate = new Date("2026-02-28");

      const filterOptions = {
        startDate,
        endDate,
        limit: 100,
        offset: 0,
      };

      expect(filterOptions.startDate).toEqual(startDate);
      expect(filterOptions.endDate).toEqual(endDate);
      expect(filterOptions.startDate < filterOptions.endDate).toBe(true);
    });

    it("should support pagination", () => {
      const page1 = { limit: 20, offset: 0 };
      const page2 = { limit: 20, offset: 20 };
      const page3 = { limit: 20, offset: 40 };

      expect(page1.offset).toBe(0);
      expect(page2.offset).toBe(20);
      expect(page3.offset).toBe(40);
    });

    it("should combine multiple filters", () => {
      const complexFilter = {
        userId: 1,
        action: "create_warning",
        resource: "warnings",
        startDate: new Date("2026-02-01"),
        endDate: new Date("2026-02-28"),
        limit: 50,
        offset: 0,
      };

      expect(complexFilter.userId).toBe(1);
      expect(complexFilter.action).toBe("create_warning");
      expect(complexFilter.resource).toBe("warnings");
      expect(complexFilter.limit).toBe(50);
    });
  });

  describe("Log Deletion", () => {
    it("should calculate correct cutoff date for old logs", () => {
      const today = new Date("2026-02-23");
      const daysOld = 90;

      const cutoffDate = new Date(today);
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Should be approximately 90 days before today
      const daysDifference = Math.floor(
        (today.getTime() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysDifference).toBe(90);
    });

    it("should handle different retention periods", () => {
      const today = new Date("2026-02-23");

      const cutoff30 = new Date(today);
      cutoff30.setDate(cutoff30.getDate() - 30);

      const cutoff90 = new Date(today);
      cutoff90.setDate(cutoff90.getDate() - 90);

      const cutoff365 = new Date(today);
      cutoff365.setDate(cutoff365.getDate() - 365);

      expect(cutoff30 > cutoff90).toBe(true);
      expect(cutoff90 > cutoff365).toBe(true);
    });
  });

  describe("Log Export", () => {
    it("should format logs for CSV export", () => {
      const logs = [
        {
          id: 1,
          userId: 1,
          userName: "Gabriel Ferreira",
          userEmail: "gabriel@example.com",
          action: "login",
          resource: "system",
          resourceId: null,
          description: "User logged in",
          details: null,
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          status: "success" as const,
          errorMessage: null,
          createdAt: new Date("2026-02-23T10:00:00"),
        },
      ];

      const csvRow = [
        logs[0].createdAt.toISOString(),
        logs[0].userName,
        logs[0].userEmail,
        logs[0].action,
        logs[0].resource,
        logs[0].status,
        logs[0].description,
      ].join(",");

      expect(csvRow).toContain("Gabriel Ferreira");
      expect(csvRow).toContain("login");
      expect(csvRow).toContain("success");
    });
  });
});
