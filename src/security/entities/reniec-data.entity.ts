import { Audit } from 'src/common/entity/audit';
import { Column, Entity, Index, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Profile } from './profile.entity';

@Entity('RENIEC_DATA')
@Index('UQ_RENIEC_DATA_TIPO_NUMERO', ['idTipoDocumentoIdentidad', 'numeroDocumento'], {
  unique: true,
})
export class ReniecData extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  idTipoDocumentoIdentidad!: number;

  @Column({ type: 'nvarchar', length: 20 })
  numeroDocumento!: string;

  @Column({ type: 'nvarchar', length: 150, nullable: true })
  nombres!: string | null;

  @Column({ type: 'nvarchar', length: 150, nullable: true })
  apellidos!: string | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  apellidoPaterno!: string | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  apellidoMaterno!: string | null;

  @OneToOne(() => Profile, (profile) => profile.reniecData)
  profile!: Profile | null;
}
