import { StringVar, NumberVar, EnumVar, BooleanVar } from './variables';

// -----------------------------------------------------------------------------

export type Variable = StringVar | NumberVar | EnumVar | BooleanVar;

export type Value = string | number | boolean

export type KeyValueSet = Record<string, Value>;

export { StringVar, NumberVar, EnumVar, BooleanVar };