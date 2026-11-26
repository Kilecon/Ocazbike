import type {
  ClientRecord,
  CreateClientInput,
  IClientRepository,
} from "./IClientRepository";

export type ClientDetail = Omit<ClientRecord, "modifiedByUserId">;

export type ClientListItem = Pick<
  ClientRecord,
  | "id"
  | "firstname"
  | "lastname"
  | "email"
  | "phonenumber"
  | "address"
  | "addressComplement"
  | "isProfessional"
  | "siret"
  | "companyName"
>;

export interface ClientListPage {
  clients: ClientListItem[];
  page: number;
  limit: number;
  total: number;
}

export class ClientService {
  constructor(private readonly clients: IClientRepository) {}

  createClient(
    input: CreateClientInput,
    actorUserId: number,
  ): Promise<ClientRecord> {
    return this.clients.create(input, actorUserId);
  }

  async updateClient(
    id: number,
    input: CreateClientInput,
    actorUserId: number,
  ): Promise<ClientDetail | null> {
    const client = await this.clients.update(id, input, actorUserId);
    return client ? this.toClientDetail(client) : null;
  }

  async getClient(id: number): Promise<ClientDetail | null> {
    const client = await this.clients.getById(id);
    return client ? this.toClientDetail(client) : null;
  }

  async listClients(input: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<ClientListPage> {
    const result = await this.clients.listPage(input);
    return {
      ...result,
      clients: result.clients.map((client) => this.toClientListItem(client)),
    };
  }

  private toClientDetail(client: ClientRecord): ClientDetail {
    const { modifiedByUserId: _modifiedByUserId, ...detail } = client;
    return detail;
  }

  private toClientListItem(client: ClientRecord): ClientListItem {
    return {
      id: client.id,
      firstname: client.firstname,
      lastname: client.lastname,
      email: client.email,
      phonenumber: client.phonenumber,
      address: client.address,
      addressComplement: client.addressComplement,
      isProfessional: client.isProfessional,
      siret: client.siret,
      companyName: client.companyName,
    };
  }
}
