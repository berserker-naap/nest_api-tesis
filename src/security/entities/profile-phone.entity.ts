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

@Entity('PROFILE_PHONE')
@Unique('UQ_PROFILE_PHONE_INTERNATIONAL_PHONE', ['internationalPhoneNumber'])
@Index('IDX_PROFILE_PHONE_VERIFIED', ['internationalPhoneNumber', 'verified'])
export class ProfilePhone extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Profile, { nullable: false })
  @JoinColumn({ name: 'idProfile' })
  profile!: Profile;

  @Column({ type: 'nvarchar', length: 8 })
  countryCode!: string;

  @Column({ type: 'nvarchar', length: 20 })
  phoneNumber!: string;

  @Column({ type: 'nvarchar', length: 20 })
  internationalPhoneNumber!: string;

  @Column({ default: false })
  verified!: boolean;

  @Column({ type: 'datetime', nullable: true })
  fechaVerificacion!: Date | null;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  alias!: string | null;
}
