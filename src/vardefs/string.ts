import { BaseVar } from './base';
import { Value } from '../types';

// -----------------------------------------------------------------------------

type StringValidator = (value: string, name: string) => string|Promise<string>;

export class StringVar extends BaseVar {
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

	public async parse(value: string) : Promise<Value> {
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

		if (!this._validator) {
			return value;
		}
		return this._validator(value, this._name);
	}
}
