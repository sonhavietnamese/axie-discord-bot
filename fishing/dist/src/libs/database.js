"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.underwaterService = exports.fishService = exports.userService = exports.db = void 0;
exports.seedFishData = seedFishData;
exports.disconnectDatabase = disconnectDatabase;
var sqlite3_1 = require("sqlite3");
var sqlite_proxy_1 = require("drizzle-orm/sqlite-proxy");
var drizzle_orm_1 = require("drizzle-orm");
var schema_1 = require("../schema");
// Create database connection
var sqlite = new sqlite3_1.default.Database('./dev.db');
exports.db = (0, sqlite_proxy_1.drizzle)(function (sql, params, method) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, new Promise(function (resolve, reject) {
                if (method === 'get') {
                    sqlite.get(sql, params, function (err, row) {
                        if (err)
                            reject(err);
                        else
                            resolve({ rows: row ? [row] : [] });
                    });
                }
                else if (method === 'all') {
                    sqlite.all(sql, params, function (err, rows) {
                        if (err)
                            reject(err);
                        else
                            resolve({ rows: rows || [] });
                    });
                }
                else {
                    sqlite.run(sql, params, function (err) {
                        if (err)
                            reject(err);
                        else
                            resolve({ rows: [] });
                    });
                }
            })];
    });
}); });
// User operations
exports.userService = {
    // Get or create a user
    getOrCreateUser: function (userId, username) {
        return __awaiter(this, void 0, void 0, function () {
            var existingUser, updatedUser, newUser;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, exports.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).get()];
                    case 1:
                        existingUser = _a.sent();
                        if (!existingUser) return [3 /*break*/, 4];
                        if (!(existingUser.name !== username)) return [3 /*break*/, 3];
                        return [4 /*yield*/, exports.db
                                .update(schema_1.users)
                                .set({ name: username, updatedAt: new Date().toISOString() })
                                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                                .returning()];
                    case 2:
                        updatedUser = (_a.sent())[0];
                        return [2 /*return*/, updatedUser];
                    case 3: return [2 /*return*/, existingUser];
                    case 4: return [4 /*yield*/, exports.db
                            .insert(schema_1.users)
                            .values({
                            id: userId,
                            name: username,
                        })
                            .returning()];
                    case 5:
                        newUser = (_a.sent())[0];
                        return [2 /*return*/, newUser];
                }
            });
        });
    },
    // Get user by ID
    getUser: function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, exports.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).get()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    // Update user's fish count
    updateFishCount: function (userId, fishCount) {
        return __awaiter(this, void 0, void 0, function () {
            var updatedUser;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, exports.db.update(schema_1.users).set({ fish: fishCount, updatedAt: new Date().toISOString() }).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).returning()];
                    case 1:
                        updatedUser = (_a.sent())[0];
                        return [2 /*return*/, updatedUser];
                }
            });
        });
    },
    // Add a fish to user's catch count
    addFish: function (userId, fishId) {
        return __awaiter(this, void 0, void 0, function () {
            var user, updatedUser;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, exports.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).get()];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            throw new Error('User not found');
                        }
                        // Create a fish catch record
                        return [4 /*yield*/, exports.db.insert(schema_1.fishCatches).values({
                                userId: userId,
                                fishId: fishId,
                            })
                            // Update user's total fish count
                        ];
                    case 2:
                        // Create a fish catch record
                        _a.sent();
                        return [4 /*yield*/, exports.db
                                .update(schema_1.users)
                                .set({ fish: user.fish + 1, updatedAt: new Date().toISOString() })
                                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                                .returning()];
                    case 3:
                        updatedUser = (_a.sent())[0];
                        return [2 /*return*/, updatedUser];
                }
            });
        });
    },
    // Get user stats
    getUserStats: function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user, userCatches, totalFish, uniqueFishTypes, raresFishCaught;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, exports.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).get()];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            return [2 /*return*/, null];
                        }
                        return [4 /*yield*/, exports.db
                                .select({
                                catch: schema_1.fishCatches,
                                fish: schema_1.fish,
                            })
                                .from(schema_1.fishCatches)
                                .innerJoin(schema_1.fish, (0, drizzle_orm_1.eq)(schema_1.fishCatches.fishId, schema_1.fish.id))
                                .where((0, drizzle_orm_1.eq)(schema_1.fishCatches.userId, userId))
                                .orderBy((0, drizzle_orm_1.desc)(schema_1.fishCatches.caughtAt))
                            // Calculate stats
                        ];
                    case 2:
                        userCatches = _a.sent();
                        totalFish = user.fish;
                        uniqueFishTypes = new Set(userCatches.map(function (c) { return c.catch.fishId; })).size;
                        raresFishCaught = userCatches.filter(function (c) { return ['rare', 'epic', 'legendary'].includes(c.fish.rarity); }).length;
                        return [2 /*return*/, {
                                user: user,
                                totalFish: totalFish,
                                uniqueFishTypes: uniqueFishTypes,
                                raresFishCaught: raresFishCaught,
                                recentCatches: userCatches.slice(0, 5),
                            }];
                }
            });
        });
    },
};
// Fish operations
exports.fishService = {
    // Get all fish
    getAllFish: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, exports.db.select().from(schema_1.fish)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    // Get fish by ID
    getFish: function (fishId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, exports.db.select().from(schema_1.fish).where((0, drizzle_orm_1.eq)(schema_1.fish.id, fishId)).get()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    // Get fish by name
    getFishByName: function (name) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, exports.db.select().from(schema_1.fish).where((0, drizzle_orm_1.eq)(schema_1.fish.name, name)).get()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    // Create a new fish type
    createFish: function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var newFish;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, exports.db.insert(schema_1.fish).values(data).returning()];
                    case 1:
                        newFish = (_a.sent())[0];
                        return [2 /*return*/, newFish];
                }
            });
        });
    },
    // Get fish by rarity
    getFishByRarity: function (rarity) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, exports.db.select().from(schema_1.fish).where((0, drizzle_orm_1.eq)(schema_1.fish.rarity, rarity))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    // Get random fish based on rarity weights
    getRandomFish: function () {
        return __awaiter(this, void 0, void 0, function () {
            var allFish, rarityWeights, weightedFish, randomIndex;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, exports.db.select().from(schema_1.fish)];
                    case 1:
                        allFish = _a.sent();
                        if (allFish.length === 0) {
                            return [2 /*return*/, null];
                        }
                        rarityWeights = {
                            common: 50,
                            uncommon: 25,
                            rare: 15,
                            epic: 7,
                            legendary: 3,
                        };
                        weightedFish = [];
                        allFish.forEach(function (fishItem) {
                            var weight = rarityWeights[fishItem.rarity] || 1;
                            for (var i = 0; i < weight; i++) {
                                weightedFish.push(fishItem);
                            }
                        });
                        randomIndex = Math.floor(Math.random() * weightedFish.length);
                        return [2 /*return*/, weightedFish[randomIndex]];
                }
            });
        });
    },
};
// Underwater operations (new table from user's schema)
exports.underwaterService = {
    // Get all underwater items
    getAllUnderwater: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, exports.db.select().from(schema_1.underwater)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    // Create a new underwater item
    createUnderwater: function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var newUnderwater;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, exports.db.insert(schema_1.underwater).values(data).returning()];
                    case 1:
                        newUnderwater = (_a.sent())[0];
                        return [2 /*return*/, newUnderwater];
                }
            });
        });
    },
    // Get random underwater item based on rarity weights
    getRandomUnderwater: function () {
        return __awaiter(this, void 0, void 0, function () {
            var allUnderwater, rarityWeights, weightedUnderwater, randomIndex;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, exports.db.select().from(schema_1.underwater)];
                    case 1:
                        allUnderwater = _a.sent();
                        if (allUnderwater.length === 0) {
                            return [2 /*return*/, null];
                        }
                        rarityWeights = {
                            common: 50,
                            uncommon: 25,
                            rare: 15,
                            epic: 7,
                            legendary: 3,
                        };
                        weightedUnderwater = [];
                        allUnderwater.forEach(function (item) {
                            var weight = rarityWeights[item.rarity] || 1;
                            for (var i = 0; i < weight; i++) {
                                weightedUnderwater.push(item);
                            }
                        });
                        randomIndex = Math.floor(Math.random() * weightedUnderwater.length);
                        return [2 /*return*/, weightedUnderwater[randomIndex]];
                }
            });
        });
    },
};
// Initialize default fish data
function seedFishData() {
    return __awaiter(this, void 0, void 0, function () {
        var existingFish, defaultFish;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.db.select().from(schema_1.fish)];
                case 1:
                    existingFish = _a.sent();
                    if (!(existingFish.length === 0)) return [3 /*break*/, 3];
                    defaultFish = [
                        {
                            name: 'Bass',
                            rarity: 'common',
                            description: 'A common freshwater fish',
                        },
                        {
                            name: 'Trout',
                            rarity: 'common',
                            description: 'A popular game fish',
                        },
                        {
                            name: 'Salmon',
                            rarity: 'uncommon',
                            description: 'A prized catch!',
                        },
                        {
                            name: 'Tuna',
                            rarity: 'rare',
                            description: 'A large and valuable fish',
                        },
                        {
                            name: 'Swordfish',
                            rarity: 'epic',
                            description: 'A majestic deep-sea predator',
                        },
                        {
                            name: 'Golden Fish',
                            rarity: 'legendary',
                            description: 'A mythical golden fish that brings good fortune!',
                        },
                    ];
                    return [4 /*yield*/, exports.db.insert(schema_1.fish).values(defaultFish)];
                case 2:
                    _a.sent();
                    console.log('Default fish data seeded!');
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Cleanup function
function disconnectDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            sqlite.close();
            return [2 /*return*/];
        });
    });
}
