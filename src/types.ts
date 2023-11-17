import { StringVar, NumberVar, EnumVar, BooleanVar } from './vardefs';

// -----------------------------------------------------------------------------

export type Variable = StringVar | NumberVar | EnumVar | BooleanVar;

export type Value = string | number | boolean

export type KeyValueSet = Record<string, Value>;
