import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { JobOfferEntity } from './job-offers.entity';

@Entity('entreprises')
export class EntrepriseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;


  @Column({ unique: true })
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  email: string; 

  @Column({ length: 255, nullable: true })
  site_web: string;


  @Column({ length: 255, nullable: true })
  localisation: string;

  @Column({ length: 20, nullable: true })
  numero_telephone: string;

  @Column({ type: 'int', default: 0 })
  statistiques_cles: number;

  @Column({ length: 255, nullable: true })
  logo: string;

  @Column({ type: 'text', nullable: true })
  valeurs: string;

  @Column({ type: 'text', nullable: true })
  specialites: string;

  @Column({ length: 50, nullable: true })
  taille_entreprise: string;

  @Column({ length: 255 })
  password: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;

  @OneToMany(() => JobOfferEntity, (jobOffer) => jobOffer.entreprise, { cascade: true })
  jobOffers: JobOfferEntity[];
}

