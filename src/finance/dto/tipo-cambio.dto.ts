export class TipoCambioDataResponseDto {
  fechaConsulta!: string;
  monedaOrigen!: string;
  monedaDestino!: string;
  tasaOrigenADestino!: number;
  tasaDestinoAOrigen!: number;
  proveedorBase!: string | null;
}
