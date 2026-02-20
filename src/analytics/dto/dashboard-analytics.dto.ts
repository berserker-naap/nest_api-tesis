export interface DashboardPredictionItemDto {
  categoriaNombre: string;
  montoPredicho: number;
  confianza: number;
  tendencia: 'UP' | 'DOWN' | 'STABLE';
}

export interface DashboardAnomalyItemDto {
  idTransaccion: number | null;
  fecha: string;
  monto: number;
  categoriaNombre: string;
  score: number;
  severidad: 'ALTA' | 'MEDIA' | 'BAJA';
  motivo: string;
}

export interface DashboardSegmentClusterDto {
  nombre: string;
  participacion: number;
  montoPromedio: number;
  categoriasDominantes: string[];
}

export interface DashboardSegmentProfileDto {
  nombre: string;
  descripcion: string;
  confianza: number;
}

export interface DashboardAnalyticsResponseDto {
  periodoInicio: string;
  periodoFin: string;
  cantidadTransacciones: number;
  prediccion: {
    proximoMes: string;
    items: DashboardPredictionItemDto[];
    fuente: 'ML_SERVICE' | 'FALLBACK';
  };
  anomalias: {
    total: number;
    items: DashboardAnomalyItemDto[];
    fuente: 'ML_SERVICE' | 'FALLBACK';
  };
  segmentacion: {
    perfil: DashboardSegmentProfileDto;
    clusters: DashboardSegmentClusterDto[];
    fuente: 'ML_SERVICE' | 'FALLBACK';
  };
  metadata: {
    proveedor: string;
    versionModelo: string;
    generadoEn: string;
  };
}
