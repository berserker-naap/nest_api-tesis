import { Audit } from 'src/common/entity/audit';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('USUARIO_CANAL')
@Unique('UQ_USUARIO_CANAL_USUARIO_CANAL', ['usuario', 'canal'])
@Unique('UQ_USUARIO_CANAL_CANAL_IDENTIFICADOR', ['canal', 'identificador'])
@Index('IDX_USUARIO_CANAL_VERIFICADO', ['canal', 'identificador', 'verificado'])
export class UsuarioCanal extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'idUsuario' })
  usuario!: Usuario;

  @Column({ type: 'nvarchar', length: 20 })
  canal!: 'WHATSAPP';

  @Column({ type: 'nvarchar', length: 20 })
  identificador!: string;

  @Column({ default: false })
  verificado!: boolean;

  @Column({ type: 'datetime', nullable: true })
  fechaVerificacion!: Date | null;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  alias!: string | null;
}
