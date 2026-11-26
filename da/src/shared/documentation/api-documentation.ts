/**
 * Documentation API - Configuration OpenAPI/Scalar
 *
 * Ce fichier centralise les informations de documentation globale pour l'API
 * et la configuration du plugin OpenAPI d'Elysia.
 *
 * Utilisé dans src/appFactory.ts pour initialiser OpenAPI (Scalar).
 */

export const API_DOCUMENTATION = {
  // ============ INFORMATIONS GÉNÉRALES ============

  info: {
    title: "Système de Gestion de Clients et Facturation",
    version: "1.0.0",
    description:
      "API complète pour la gestion des clients, documents de facturation, réparations et demandes de support. Sécurisée par JWT avec rôles (Admin, Subadmin, User).",
    contact: {
      name: "Support Technique",
      email: "support@example.com",
      url: "https://support.example.com",
    },
    license: {
      name: "Propriétaire",
      url: "https://example.com/license",
    },
  },

  // ============ SERVEURS ============

  servers: [
    {
      url: "http://localhost:3000",
      description: "Serveur de développement local",
      variables: {
        port: {
          default: "3000",
          description: "Port du serveur local",
        },
      },
    },
    {
      url: "https://api.example.com",
      description: "Serveur de production",
    },
    {
      url: "https://staging.api.example.com",
      description: "Serveur de staging/test",
    },
  ],

  // ============ TAGS (GROUPES DE ROUTES) ============

  tags: [
    {
      name: "Auth",
      description: "Authentification, gestion des sessions et utilisateurs",
      externalDocs: {
        description: "Guide d'authentification",
        url: "https://docs.example.com/auth",
      },
    },
    {
      name: "Admin",
      description:
        "Routes administrateur (création d'utilisateurs, management)",
      externalDocs: {
        description: "Guide administration",
        url: "https://docs.example.com/admin",
      },
    },
    {
      name: "Clients",
      description: "Gestion des clients et profils",
    },
    {
      name: "Facturation",
      description:
        "Dossiers de réparation, vente, rachat et location, devis et factures",
    },
    {
      name: "Store information",
      description:
        "Informations administratives et bancaires chiffrées du magasin",
    },
    {
      name: "Support",
      description:
        "Gestion des demandes de support, incidents et bugs avec notifications Discord",
    },
  ],

  // ============ COMPOSANTS - SCHÉMAS RÉUTILISABLES ============

  components: {
    schemas: {
      User: {
        type: "object",
        required: [
          "id",
          "email",
          "firstname",
          "lastname",
          "role",
          "isActive",
          "mustChangePassword",
          "lastLoginAtEpochMs",
          "createdAtEpochMs",
          "updatedAtEpochMs",
        ],
        properties: {
          id: {
            type: "integer",
            description: "Identifiant unique",
            example: 1,
          },
          email: {
            type: "string",
            format: "email",
            description: "Adresse email unique",
            example: "john.doe@example.com",
          },
          firstname: {
            type: "string",
            maxLength: 100,
            description: "Prénom",
            example: "John",
          },
          lastname: {
            type: "string",
            maxLength: 100,
            description: "Nom de famille",
            example: "Doe",
          },
          role: {
            type: "string",
            enum: ["Admin", "Subadmin"],
            description: "Rôle de l'utilisateur",
          },
          isActive: {
            type: "boolean",
            description: "Statut d'activation",
            example: true,
          },
          mustChangePassword: {
            type: "boolean",
            description:
              "Indique si l'utilisateur doit changer son mot de passe",
            example: false,
          },
          lastLoginAtEpochMs: {
            type: "integer",
            nullable: true,
            description: "Dernier accès (millisecondes Unix UTC)",
            example: 1792233045000,
          },
          createdAtEpochMs: {
            type: "integer",
            description: "Date de création (millisecondes Unix UTC)",
            example: 1792345056546,
          },
          updatedAtEpochMs: {
            type: "integer",
            description: "Date de modification (millisecondes Unix UTC)",
            example: 1792539358818,
          },
        },
      },

      Client: {
        type: "object",
        required: ["id", "name", "city", "email", "phone"],
        properties: {
          id: {
            type: "integer",
            description: "Identifiant unique",
            example: 42,
          },
          name: {
            type: "string",
            description: "Nom du client",
            example: "ACME Corporation",
          },
          city: {
            type: "string",
            description: "Ville du client",
            example: "Paris",
          },
          email: {
            type: "string",
            format: "email",
            description: "Email (encrypté)",
            example: "contact@acme.fr",
          },
          phone: {
            type: "string",
            description: "Téléphone (encrypté)",
            example: "06 00 00 00 00",
          },
        },
      },

      BillingDocument: {
        type: "object",
        required: ["id", "clientId", "type", "date", "status"],
        properties: {
          id: {
            type: "integer",
            example: 1,
          },
          clientId: {
            type: "integer",
            description: "Client associé",
            example: 42,
          },
          type: {
            type: "string",
            enum: ["repair", "purchase", "sale"],
            description: "Type de document",
          },
          date: {
            type: "integer",
            description: "Date du document (UTC milliseconde)",
            example: 1729174798000,
          },
          status: {
            type: "string",
            enum: [
              "draft",
              "open",
              "in_progress",
              "waiting_customer",
              "closed",
            ],
            description: "Statut actuel",
          },
          comment: {
            type: "string",
            description: "Commentaire optionnel",
          },
        },
      },

      SupportRequest: {
        type: "object",
        required: ["id", "reference", "type", "title", "description", "status"],
        properties: {
          id: {
            type: "integer",
            example: 1,
          },
          reference: {
            type: "string",
            description: "Référence unique formatée",
            example: "SR-2026-10-17-001",
          },
          type: {
            type: "string",
            enum: ["SR", "INC", "BUG"],
            description: "SR=Service Request, INC=Incident, BUG=Bug",
          },
          title: {
            type: "string",
            description: "Titre de la demande",
            example: "Connexion impossible",
          },
          description: {
            type: "string",
            description: "Description détaillée",
          },
          status: {
            type: "string",
            enum: [
              "open",
              "in_progress",
              "waiting_customer",
              "resolved",
              "closed",
            ],
            description: "Statut actuel",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Date de création UTC",
            example: "2026-10-17T10:30:00Z",
          },
          createdByUserId: {
            type: "integer",
            description: "Identifiant du créateur",
          },
        },
      },

      Error: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: {
            type: "string",
            description: "Code d'erreur métier",
            examples: [
              "UNAUTHORIZED",
              "FORBIDDEN_ROLE",
              "INVALID_CREDENTIALS",
              "DUPLICATE_EMAIL",
              "CLIENT_NOT_FOUND",
            ],
          },
          message: {
            type: "string",
            description: "Message d'erreur lisible",
            example: "Invalid credentials",
          },
        },
      },
    },

    // ============ SÉCURITÉ ============

    securitySchemes: {
      AccessCookie: {
        type: "apiKey",
        in: "cookie",
        name: "access_token",
        description:
          "JWT d'accès posé en cookie HttpOnly par /auth/login et /auth/refresh, envoyé automatiquement par le navigateur.",
      },
      RefreshCookie: {
        type: "apiKey",
        in: "cookie",
        name: "refresh_token",
        description:
          "Refresh token en cookie HttpOnly (chemin /auth), utilisé par /auth/refresh pour renouveler le cookie d'accès.",
      },
    },
  },

  // ============ CONFIGURATION OPENAPI ============

  openapi: {
    path: "/docs",
    excludedPaths: ["/health", "/health/"],
    scalar: {
      theme: "moon" as const,
      forceDarkModeState: "dark" as const,
      layout: "modern" as const,
      defaultHttpClient: { targetKey: "node" as const, clientKey: "fetch" },
      hideDownloadButton: false,
      customCss: `
        .sidebar {
          background-color: #1e1e1e;
        }
      `,
    },
  },

  // ============ CONVENTIONS & STANDARDS ============

  conventions: {
    authentication: {
      description: "Authentification JWT par cookies HttpOnly",
      required_on_protected_routes: true,
      cookie_name: "access_token",
      csrf: "SameSite=Strict + en-tête X-App-Id obligatoire",
      ttl: "15 minutes",
      refresh: "POST /auth/refresh",
    },

    dates: {
      description: "Format ISO 8601 avec timezone (obligatoire)",
      input_format: "YYYY-MM-DDTHH:mm:ss(Z|±HH:mm)",
      input_examples: [
        "2026-10-17T13:39:58Z",
        "2026-10-17T15:39:58+02:00",
        "2026-10-17T08:39:58-05:00",
      ],
      output_format: "UTC milliseconds (Unix epoch * 1000)",
      output_examples: [1729174798000],
      storage:
        "INTEGER columns (dateEpochMs, createdAtEpochMs, updatedAtEpochMs, etc)",
      queries: "MUST use MS columns only, never TEXT",
    },

    pagination: {
      description: "Pagination basée sur numéro de page",
      default_page: 1,
      default_page_size: 20,
      max_page_size: 100,
      total_in_response: true,
    },

    error_handling: {
      format: "{ code: string, message: string }",
      codes: {
        "400": "Bad Request - Validation ou format invalide",
        "401": "Unauthorized - JWT invalide/expiré ou credentials incorrects",
        "403": "Forbidden - Rôle insuffisant ou ressource interdite",
        "404": "Not Found - Ressource inexistante",
        "409": "Conflict - Ressource en doublon (email, etc)",
        "500": "Internal Server Error - Erreur serveur",
      },
    },

    roles: {
      Admin:
        "Accès complet: gestion utilisateurs, tous les clients, tous les documents",
      Subadmin:
        "Accès étendu: gestion de leurs clients et documents, pas de management utilisateur",
      User: "Accès basique: lecture des clients et documents créés",
    },
  },

  // ============ SÉCURITÉ & CONFORMITÉ ============

  security: {
    description: "Guide de sécurité API",
    encryption: {
      client_data: "AES-256-GCM avec salt par client",
      passwords: "bcrypt (12 rounds minimum)",
      transport: "HTTPS obligatoire en production",
    },

    rate_limiting: {
      enabled: true,
      policy:
        "300 requêtes par adresse IP et par instance sur 15 minutes pour toutes les routes; 5 échecs de connexion par compte et par IP sur 15 minutes",
    },

    cors: {
      allowed_origins: [
        "http://localhost:3111 (dev)",
        "https://app.example.com (prod)",
      ],
      allowed_methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowed_headers: ["Content-Type", "X-App-Id"],
      credentials: true,
    },

    app_id_validation: {
      development: "Désactivée (bypass)",
      production: "Obligatoire (header X-App-Id)",
      header_name: "X-App-Id",
      description: "Identifiant unique du client SPA (sécurité supplémentaire)",
    },
  },

  // ============ VERSIONING & DEPRECATION ============

  versioning: {
    current: "1.0.0",
    deprecation_policy:
      "Les endpoints dépréciés seront marqués et supportés 6 mois avant suppression",
  },

  // ============ COORDONNÉES & SUPPORT ============

  support: {
    documentation: "https://docs.example.com",
    status_page: "https://status.example.com",
    email: "support@example.com",
    discord: "https://discord.gg/example",
    response_time: "< 24 heures",
  },
};
