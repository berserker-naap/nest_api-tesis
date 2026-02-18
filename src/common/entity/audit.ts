import { Column } from 'typeorm';

export abstract class Audit {
  @Column({ default: true })
  activo!: boolean;

  @Column({ default: false })
  eliminado!: boolean;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  ipRegistro!: string;

  @Column({ type: 'datetime', default: () => 'GETDATE()' })
  fechaRegistro!: Date;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  usuarioRegistro!: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  ipModificacion!: string;

  @Column({ type: 'datetime', nullable: true })
  fechaModificacion!: Date;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  usuarioModificacion!: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  ipEliminacion!: string;

  @Column({ type: 'datetime', nullable: true })
  fechaEliminacion!: Date;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  usuarioEliminacion!: string;
}
