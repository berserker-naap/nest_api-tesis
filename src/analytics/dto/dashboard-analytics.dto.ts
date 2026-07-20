export interface DashboardPredictionItemDto {
  idCategoria: number | null;
  categoriaNombre: string;
  montoPredicho: number;
  confianza: number;
  aptoPresupuesto: boolean;
  montoPresupuestoSugerido: number | null;
  tendencia: 'UP' | 'DOWN' | 'STABLE';
}

export interface DashboardAnomalyItemDto {
  idTransaccion: number | null;
  idCategoria: number | null;
  fecha: string;
  monto: number;
  categoriaNombre: string;
  score: number;
  severidad: 'ALTA' | 'MEDIA' | 'BAJA';
  motivo: string;
  monedaCodigo: string;
  monedaSimbolo: string;
}

export interface DashboardDominantCategoryDto {
  idCategoria: number | null;
  nombre: string;
}

export interface DashboardSegmentClusterDto {
  nombre: string;
  participacion: number;
  montoPromedio: number;
  categoriasDominantes: string[];
  categoriasDominantesDetalle: DashboardDominantCategoryDto[];
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
  monedaCodigo: string;
  monedaSimbolo: string;
  resumenAccionable: {
    totalPredicho: number;
    categoriaMayorCrecimiento: DashboardDominantCategoryDto | null;
    oportunidadAhorro: (DashboardDominantCategoryDto & { montoEstimado: number }) | null;
  };
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
