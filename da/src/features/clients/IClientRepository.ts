interface ClientFieldsInput {
  firstname: string;
  lastname: string;
  email?: string | null;
  phonenumber?: string | null;
  address?: string | null;
  addressComplement?: string | null;
  identityCardNumber?: string | null;
  privatenote?: string;
}

export type CreateClientInput = ClientFieldsInput &
  (
    | {
        isProfessional?: false;
        siret?: null;
        companyName?: null;
      }
    | {
        isProfessional: true;
        siret?: string | null;
        companyName?: string | null;
      }
  );

export interface ClientRecord {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string;
  address: string | null;
  addressComplement: string | null;
  identityCardNumber: string | null;
  privatenote: string | null;
  isProfessional: boolean;
  siret: string | null;
  companyName: string | null;
  modifiedByUserId: number | null;
  lastModificationMs: number;
  createdAtMs: number;
}

export interface ClientPage {
  clients: ClientRecord[];
  page: number;
  limit: number;
  total: number;
}

export interface IClientRepository {
  create(input: CreateClientInput, actorUserId: number): Promise<ClientRecord>;
  getById(id: number): Promise<ClientRecord | null>;
  update(
    id: number,
    input: CreateClientInput,
    actorUserId: number,
  ): Promise<ClientRecord | null>;
  listPage(input: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<ClientPage>;
}
