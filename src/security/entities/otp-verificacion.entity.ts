import { Audit } from 'src/common/entity/audit';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('OTP_VERIFICACION')
@Index('IDX_OTP_USUARIO_WHATSAPP_DESTINO', [
  'usuario',
  'canal',
  'destino',
  'fechaUso',
  'fechaExpiracion',
])
export class OtpVerificacion extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'idUsuario' })
  usuario!: Usuario;

  @Column({ type: 'nvarchar', length: 20 })
  canal!: 'WHATSAPP';

  @Column({ type: 'nvarchar', length: 200 })
  destino!: string;

  @Column({ type: 'nvarchar', length: 200 })
  codigoHash!: string;

  @Column({ type: 'datetime' })
  fechaExpiracion!: Date;

  @Column({ type: 'datetime', nullable: true })
  fechaUso!: Date | null;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'int', default: 5 })
  maxAttempts!: number;
}
