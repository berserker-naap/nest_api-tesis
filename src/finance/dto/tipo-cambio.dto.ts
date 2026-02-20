export class TipoCambioDataResponseDto {
  id!: number;
  fechaConsulta!: string;
  monedaOrigen!: string;
  monedaDestino!: string;
  tasaOrigenADestino!: number;
  tasaDestinoAOrigen!: number;
  fuente!: string;
  proveedorBase!: string | null;
  fechaProveedor!: string | null;
  fechaHoraProveedor!: Date | null;
  fechaRegistro!: Date;
  desdeCache!: boolean;
}
