import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CancelarTurnosComponent } from './cancelar-turnos.component';

describe('CancelarTurnosComponent', () => {
  let component: CancelarTurnosComponent;
  let fixture: ComponentFixture<CancelarTurnosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CancelarTurnosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CancelarTurnosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
