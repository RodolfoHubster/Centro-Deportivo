# databasePHP
## Guía para crear tu branch de trabajo y hacer merge

### 1. Crear una nueva rama (branch)
```bash
# Asegúrate de estar en la rama principal (main)
git checkout main
#actualiza tu codigo con el main:
git pull origin main

# Crea una nueva rama o cambia a una rama (el nombre debea ser en lo que estes trabajando)
git checkout -b nombre-de-tu-rama
```

### 2. Trabajar en tu rama
- Realiza tus cambios en el código
- Guarda tus cambios frecuentemente:
```bash
git add .
git commit -m "Descripción clara de tus cambios"
```

### 3. Una vez hecho el paso 2, Sube tus cambios a GitHub
```bash
git push origin nombre-de-tu-rama
```

### 4. Crear un Pull Request (PR)
1. Ve a GitHub y crea un nuevo Pull Request
2. Selecciona:
   - Base branch: `main`
   - Compare branch: `nombre-de-tu-rama`
3. Describe tus cambios
4. Espera la revisión y aprobación

### 5. Después de la aprobación
```bash
# Vuelve a la rama principal
git checkout main
git pull origin main
```
