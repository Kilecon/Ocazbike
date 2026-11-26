export interface PasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, passwordHash: string): Promise<boolean>;
}

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly rounds: number) {}

  hash(password: string): Promise<string> {
    return Bun.password.hash(password, {
      algorithm: "bcrypt",
      cost: this.rounds,
    });
  }

  async compare(password: string, passwordHash: string): Promise<boolean> {
    try {
      return await Bun.password.verify(password, passwordHash, "bcrypt");
    } catch {
      return false;
    }
  }
}
