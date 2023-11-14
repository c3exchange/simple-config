import { Value } from "./types";

abstract class VarDef {
	protected _name: string;
	protected _required: boolean;
	protected _default?: Value;

	protected constructor(name: string) {
		if (typeof name !== 'string' || name.length < 0) {
			throw new Error('Invalid variable name');
		}
		this._name = name.toUpperCase();
		this._required = false;
	}

	public getName(): string {
		return this._name;
	}

	public isRequired(): boolean {
		return this._required;
	}

	public getDefault(): Value | undefined {
		return this._default;
	}

	protected setRequired() {
		this._required = true;
	}

	protected setDefault(value: Value) {
		this._default = value;
	}

	public abstract getType(): string;

	public abstract evaluate(value: string): Value | Promise<Value>;
}

// -----------------------------------------------------------------------------

type NumberValidator = (value: number) => number|Promise<number>;

export class NumberVar extends VarDef {
	protected _min?: number;
	protected _max?: number;
	protected _isInt: boolean;
	protected _validator?: NumberValidator;

	public static define(name: string) {
		return new NumberVar(name);
	}

	private constructor(name: string) {
		super(name);
		this._isInt = false;
	}

	public getType(): string {
		return 'number';
	}

	public min(value: number): NumberVar {
		if (typeof value !== 'number' || isNaN(value)) {
			throw new Error('Invalid variable definition for "' + this._name + '" (value of min)');
		}
		if (typeof this._max !== 'undefined' && value > this._max) {
			throw new Error('Invalid variable definition for "' + this._name + '" (min > max)');
		}
		this._min = value;
		return this;
	}

	public max(value: number): NumberVar {
		if (typeof value !== 'number' || isNaN(value)) {
			throw new Error('Invalid variable definition for "' + this._name + '" (value of max)');
		}
		if (typeof this._min !== 'undefined' && value < this._min) {
			throw new Error('Invalid variable definition for "' + this._name + '" (max < min)');
		}
		this._max = value;
		return this;
	}

	public isInt(): NumberVar {
		this._isInt = true;
		return this;
	}

	public required(): NumberVar {
		super.setRequired();
		return this;
	}

	public default(value: number): NumberVar {
		super.setDefault(value);
		return this;
	}

	public validator(fn: NumberValidator): NumberVar {
		this._validator = fn;
		return this;
	}

	public evaluate(value: string) : Value | Promise<Value> {
		let v: number|Promise<number>;

		if (this._isInt) {
			v = parseInt(value, 10);
			if (isNaN(v)) {
				throw new Error('Variable "' + this._name + '" does not contain a valid integer value');
			}
		}
		else {
			v = parseFloat(value);
			if (isNaN(v)) {
				throw new Error('Variable "' + this._name + '" does not contain a valid numeric value');
			}
		}

		if (typeof this._min !== 'undefined') {
			if (v < this._min) {
				throw new Error('Variable "' + this._name + '" is less than ' + this._min.toFixed());
			}
		}
		if (typeof this._max !== 'undefined') {
			if (v > this._max) {
				throw new Error('Variable "' + this._name + '" is greater than ' + this._max.toFixed());
			}
		}

		if (this._validator) {
			v = this._validator(v);
		}
		
		return v;
	}
}

// -----------------------------------------------------------------------------

type StringValidator = (value: string) => string|Promise<string>;

export class StringVar extends VarDef {
	protected _minLength?: number;
	protected _maxLength?: number;
	protected _validator?: StringValidator;

	public static define(name: string) {
		return new StringVar(name);
	}

	private constructor(name: string) {
		super(name);
	}

	public getType(): string {
		return 'string';
	}

	public minLength(len: number): StringVar {
		if (typeof len !== 'number' || isNaN(len) || len < 0) {
			throw new Error('Invalid variable definition for "' + this._name + '" (value of minLength)');
		}
		if (typeof this._maxLength !== 'undefined' && len > this._maxLength) {
			throw new Error('Invalid variable definition for "' + this._name + '" (minLength > maxLength)');
		}
		this._minLength = len;
		return this;
	}

	public maxLength(len: number): StringVar {
		if (typeof len !== 'number' || isNaN(len) || len < 0) {
			throw new Error('Invalid variable definition for "' + this._name + '" (value of maxLength)');
		}
		if (typeof this._minLength !== 'undefined' && len < this._minLength) {
			throw new Error('Invalid variable definition for "' + this._name + '" (maxLength < minLength)');
		}
		this._maxLength = len;
		return this;
	}

	public required(): StringVar {
		super.setRequired();
		return this;
	}

	public default(value: string): StringVar {
		super.setDefault(value);
		return this;
	}

	public validator(fn: StringValidator): StringVar {
		this._validator = fn;
		return this;
	}

	public evaluate(value: string) : Value | Promise<Value> {
		let v: string|Promise<string>;

		if (typeof this._minLength !== 'undefined') {
			if (value.length < this._minLength) {
				throw new Error('Variable "' + this._name + '" is too short');
			}
		}
		if (typeof this._maxLength !== 'undefined') {
			if (value.length > this._maxLength) {
				throw new Error('Variable "' + this._name + '" is too long');
			}
		}

		if (this._validator) {
			v = this._validator(value);
		}
		else {
			v = value;
		}

		return v;
	}
}

// -----------------------------------------------------------------------------

export class EnumVar extends VarDef {
	protected _allowed?: string[];

	public static define(name: string) {
		return new EnumVar(name);
	}

	private constructor(name: string) {
		super(name);
		this._allowed = [];
	}

	public getType(): string {
		return 'enum';
	}

	public allowed(values: string[]): EnumVar {
		if (!Array.isArray(values)) {
			throw new Error('Invalid variable definition for "' + this._name + '" (allowed values)');
		}
		this._allowed = [];
		for (const value of values) {
			if (typeof value !== 'string' || value.length < 1) {
				throw new Error('Invalid variable definition for "' + this._name + '" (allowed values)');
			}
			this._allowed.push(value.toUpperCase());
		}
		return this;
	}

	public required(): EnumVar {
		super.setRequired();
		return this;
	}

	public default(value: string): EnumVar {
		super.setDefault(value);
		return this;
	}

	public evaluate(value: string) : Value | Promise<Value> {
		value = value.toUpperCase();

		let found = false;
		if (this._allowed) {
			for (const allowedValue of this._allowed) {
				if (value == allowedValue) {
					found = true;
					break;
				}
			}
		}

		if (!found) {
			throw new Error('Variable "' + this._name + '" does not contain an allowed value');
		}

		return value;
	}
}

// -----------------------------------------------------------------------------

export class BooleanVar extends VarDef {
	public static define(name: string) {
		return new BooleanVar(name);
	}

	private constructor(name: string) {
		super(name);
	}

	public getType(): string {
		return 'bool';
	}

	public required(): BooleanVar {
		super.setRequired();
		return this;
	}

	public default(value: boolean): BooleanVar {
		super.setDefault(value);
		return this;
	}

	public evaluate(value: string) : Value | Promise<Value> {
		value = value.toLowerCase();
		if (value == '0' || value == 'off' || value == 'false' || value == 'f' || value == 'no' || value == 'n') {
			return false;
		}
		if (value == '1' || value == 'on' || value == 'true' || value == 't' || value == 'yes' || value == 'y') {
			return true;
		}
		throw new Error('Variable "' + this._name + '" does not contain a boolean value');
	}
}
