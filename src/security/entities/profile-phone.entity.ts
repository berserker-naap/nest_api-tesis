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
import { Profile } from './profile.entity';
import { ProfilePhoneStatus } from '../enums/profile-phone-status.enum';

@Entity('PROFILE_PHONE')
@Unique('UQ_PROFILE_PHONE_INTERNATIONAL_PHONE', ['internationalPhoneNumber'])
@Index('IDX_PROFILE_PHONE_STATUS', ['internationalPhoneNumber', 'validacionEstado'])
export class ProfilePhone extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Profile, (profile) => profile.profilePhones, { nullable: false })
  @JoinColumn({ name: 'idProfile' })
  profile!: Profile;

  @Column({ type: 'nvarchar', length: 8 })
  countryCode!: string;

  @Column({ type: 'nvarchar', length: 20 })
  phoneNumber!: string;

  @Column({ type: 'nvarchar', length: 20 })
  internationalPhoneNumber!: string;

  @Column({
    type: 'nvarchar',
    length: 20,
    default: ProfilePhoneStatus.PENDING,
  })
  validacionEstado!: ProfilePhoneStatus;

  @Column({ type: 'datetime', nullable: true })
  fechaVerificacion!: Date | null;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  alias!: string | null;
}
