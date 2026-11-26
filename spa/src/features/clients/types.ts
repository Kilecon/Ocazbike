export interface ClientDetailDTO {
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
  lastModificationMs: number;
  createdAtMs: number;
}

export type ClientListItemDTO = Omit<
  ClientDetailDTO,
  "privatenote" | "identityCardNumber" | "lastModificationMs" | "createdAtMs"
>;

export interface ClientPageDTO {
  clients: ClientListItemDTO[];
  page: number;
  limit: number;
  total: number;
}

export type ClientDTO = ClientDetailDTO & {
  modifiedByUserId: number | null;
};

export interface ClientFieldsInputDTO {
  firstname: string;
  lastname: string;
  email?: string | null;
  phonenumber?: string | null;
  address?: string;
  addressComplement?: string;
  identityCardNumber?: string | null;
  privatenote?: string;
}

export type ClientInputDTO = ClientFieldsInputDTO &
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
