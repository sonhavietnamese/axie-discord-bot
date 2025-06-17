"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.underwater = exports.fishCatches = exports.fish = exports.users = void 0;
var sqlite_core_1 = require("drizzle-orm/sqlite-core");
var drizzle_orm_1 = require("drizzle-orm");
// Users table
exports.users = (0, sqlite_core_1.sqliteTable)('users', {
    id: (0, sqlite_core_1.text)('id').primaryKey(), // Discord user ID
    name: (0, sqlite_core_1.text)('name').notNull(), // Discord username
    fish: (0, sqlite_core_1.integer)('fish').default(0).notNull(), // Number of fish caught
    createdAt: (0, sqlite_core_1.text)('created_at')
        .default((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"]))))
        .notNull(),
    updatedAt: (0, sqlite_core_1.text)('updated_at')
        .default((0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"]))))
        .notNull(),
});
// Fish table
exports.fish = (0, sqlite_core_1.sqliteTable)('fish', {
    id: (0, sqlite_core_1.text)('id')
        .primaryKey()
        .$defaultFn(function () { return crypto.randomUUID(); }),
    name: (0, sqlite_core_1.text)('name').unique().notNull(),
    rarity: (0, sqlite_core_1.text)('rarity').notNull(), // common, uncommon, rare, epic, legendary
    image: (0, sqlite_core_1.text)('image'), // Image URL for the fish
    description: (0, sqlite_core_1.text)('description'),
});
// Fish catches table (junction table for user-fish relationships)
exports.fishCatches = (0, sqlite_core_1.sqliteTable)('fish_catches', {
    id: (0, sqlite_core_1.text)('id')
        .primaryKey()
        .$defaultFn(function () { return crypto.randomUUID(); }),
    userId: (0, sqlite_core_1.text)('user_id')
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    fishId: (0, sqlite_core_1.text)('fish_id')
        .notNull()
        .references(function () { return exports.fish.id; }, { onDelete: 'cascade' }),
    caughtAt: (0, sqlite_core_1.text)('caught_at')
        .default((0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"]))))
        .notNull(),
}, function (table) { return ({
    userIdIndex: (0, sqlite_core_1.index)('fish_catches_user_id_idx').on(table.userId),
    fishIdIndex: (0, sqlite_core_1.index)('fish_catches_fish_id_idx').on(table.fishId),
}); });
// Underwater table (based on user's schema addition)
exports.underwater = (0, sqlite_core_1.sqliteTable)('underwaters', {
    id: (0, sqlite_core_1.text)('id')
        .primaryKey()
        .$defaultFn(function () { return crypto.randomUUID(); }),
    name: (0, sqlite_core_1.text)('name').unique().notNull(),
    rarity: (0, sqlite_core_1.text)('rarity').notNull(), // common, uncommon, rare, epic, legendary
    image: (0, sqlite_core_1.text)('image'), // Image URL
    description: (0, sqlite_core_1.text)('description'),
});
var templateObject_1, templateObject_2, templateObject_3;
