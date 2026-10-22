import type { Address } from "@/types";

const VIA_CEP_API = "https://viacep.com.br/ws";

export interface CEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export async function fetchCEP(cep: string): Promise<Address | null> {
  const cleanCEP = cep.replace(/\D/g, "");
  if (cleanCEP.length !== 8) return null;

  try {
    const response = await fetch(`${VIA_CEP_API}/${cleanCEP}/json/`);
    const data: CEPResponse = await response.json();

    if (data.erro) {
      return null;
    }

    return {
      street: data.logradouro || "",
      number: "",
      complement: data.complemento || "",
      neighborhood: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
      zipCode: data.cep || cleanCEP,
    };
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    return null;
  }
}
