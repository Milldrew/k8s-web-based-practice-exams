import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

interface Certification {
  id: string;
  name: string;
  fullName: string;
  description: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  certifications: Certification[] = [
    {
      id: 'cka',
      name: 'CKA',
      fullName: 'Certified Kubernetes Administrator',
      description: 'Master Kubernetes administration skills with hands-on practice exams.',
      icon: 'admin_panel_settings',
      color: '#326CE5'
    },
    {
      id: 'ckad',
      name: 'CKAD',
      fullName: 'Certified Kubernetes Application Developer',
      description: 'Build and deploy cloud-native applications on Kubernetes.',
      icon: 'code',
      color: '#00B4A0'
    },
    {
      id: 'cks',
      name: 'CKS',
      fullName: 'Certified Kubernetes Security Specialist',
      description: 'Secure Kubernetes clusters and cloud-native applications.',
      icon: 'security',
      color: '#F57C00'
    }
  ];

  constructor(private router: Router) {}

  navigateToCertification(certId: string): void {
    this.router.navigate([`/${certId}`]);
  }
}
