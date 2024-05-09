import { BaseVar } from './base';
import { Value } from '../types';

// -----------------------------------------------------------------------------

export class EnumVar extends BaseVar {
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
			this._allowed.push(value);
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

	public parse(value: string) : Value {
		value = value.toUpperCase();

		if (this._allowed) {
			for (const allowedValue of this._allowed) {
				if (value == allowedValue.toUpperCase()) {
					return allowedValue;
				}
			}
		}

		throw new Error('Variable "' + this._name + '" does not contain an allowed value');
	}
}
