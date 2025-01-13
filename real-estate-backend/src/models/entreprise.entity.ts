import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { JobOfferEntity } from './job-offers.entity';
import { OneToMany } from 'typeorm';

@Entity('entreprises')
export class EntrepriseEntity {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  nom: string;

  @Column({ nullable: true })
  description: string;

  @Column('json', { nullable: true })
  email: any;
  
  @Column({ nullable: true })
  localisation: string;

  @Column({ nullable: true })
  numero_telephone: string;

  @Column({ default: 0 })
  statistiques_cles: number;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  valeurs: string;

  @Column({ nullable: true })
  specialites: string;

  @Column({ nullable: true })
  taille_entreprise: string;

  @Column({ nullable: true })
  password: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;


  @OneToMany(() => JobOfferEntity, (jobOffer) => jobOffer.entreprise)
  jobOffers: JobOfferEntity[];
}

