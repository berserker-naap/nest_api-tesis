import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('OTP_VERIFICACION')
@Index('IDX_OTP_USUARIO_CANAL_DESTINO', [
  'usuario',
  'canal',
  'destino',
  'usedAt',
  'expiresAt',
])
export class OtpVerificacion {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'idUsuario' })
  usuario!: Usuario;

  @Column({ type: 'nvarchar', length: 20 })
  canal!: 'SMS' | 'EMAIL';

  @Column({ type: 'nvarchar', length: 200 })
  destino!: string;

  @Column({ type: 'nvarchar', length: 200 })
  codigoHash!: string;

  @Column({ type: 'datetime' })
  expiresAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  usedAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'int', default: 5 })
  maxAttempts!: number;

  @Column({ type: 'datetime', default: () => 'GETDATE()' })
  createdAt!: Date;
}
