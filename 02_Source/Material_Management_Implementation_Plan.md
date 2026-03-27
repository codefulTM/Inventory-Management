# Material Management Implementation Plan

**Version:** 1.0  
**Date:** March 6, 2026  
**Scope:** Full Stack (Backend + Frontend + Database)  
**Timeline:** 1-2 weeks  
**Priority:** P0 (Core Feature)

---

## 📋 Table of Contents

1. [Overview & Requirements](#overview--requirements)
2. [Architecture](#architecture)
3. [Implementation Phases](#implementation-phases)
4. [Backend Implementation Details](#backend-implementation-details)
5. [Frontend Implementation Details](#frontend-implementation-details)
6. [Integration & Testing](#integration--testing)
7. [Verification Checklist](#verification-checklist)
8. [Dependencies & Prerequisites](#dependencies--prerequisites)
9. [Risk Mitigation](#risk-mitigation)

---

## Overview & Requirements

### User Requirements

| Aspect                   | Details                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| **Implementation Scope** | Full Stack (Backend + Frontend + Database)                                                |
| **Core Features**        | CRUD Operations + Search & Filtering                                                      |
| **User Roles**           | Manager (full), Operator (create/view/limited edit), QC Tech (view-only), IT Admin (full) |
| **Timeline**             | 1-2 weeks with parallel backend + frontend work                                           |

### Success Criteria

- ✅ All CRUD operations working end-to-end
- ✅ Search/filtering functional (by name, type, part_number)
- ✅ RBAC enforcement at API level (role-based access)
- ✅ Proper error handling and validation (client + server)
- ✅ All 4 user roles can execute their permitted actions
- ✅ Backend & frontend unit tests passing
- ✅ API response time < 2 seconds

---

## Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│ Frontend Layer (React 18 + TypeScript)                 │
│ - React Router for navigation                          │
│ - SWR/React Query for data fetching & caching         │
│ - Form validation (React Hook Form + Zod/Yup)         │
│ - CSS Modules / Tailwind for styling                  │
└────────────────────┬────────────────────────────────────┘
                     │
         HTTP/REST API (JSON) with JWT auth
                     │
┌────────────────────▼────────────────────────────────────┐
│ Backend Layer (NestJS + TypeScript)                     │
│ - Controllers (API endpoints + RBAC guards)            │
│ - Services (business logic, validation)                │
│ - Repositories (MongoDB operations)                    │
│ - DTOs (data validation & transformation)              │
│ - Mongoose Models & Schemas                           │
└────────────────────┬────────────────────────────────────┘
                     │
              MongoDB Driver
                     │
┌────────────────────▼────────────────────────────────────┐
│ Database Layer (MongoDB)                               │
│ - Materials collection with indexed queries           │
│ - Audit logs collection (for change tracking)         │
└─────────────────────────────────────────────────────────┘
```

### Data Model

```typescript
// Material Schema (MongoDB)
{
  _id: ObjectId,
  material_id: string (unique),        // PK: "MAT-001"
  part_number: string (unique),       // "PART-12345"
  material_name: string,              // "Ascorbic Acid (Vitamin C)"
  material_type: enum,                // "API" | "Excipient" | "Container" | ...
  storage_conditions?: string,        // "2-8°C, protected from light"
  specification_document?: string,    // "SPEC-VC-001.pdf"
  created_date: Date,                 // Auto-generated
  modified_date: Date                 // Auto-updated
}
```

### RBAC Permissions

| Action              | Manager | Operator             | QC Tech | IT Admin |
| ------------------- | ------- | -------------------- | ------- | -------- |
| **View**            | ✅ All  | ✅ All               | ✅ All  | ✅ All   |
| **Create**          | ✅      | ✅                   | ❌      | ✅       |
| **Update**          | ✅      | ⚠️ (own fields only) | ❌      | ✅       |
| **Delete**          | ❌      | ❌                   | ❌      | ✅       |
| **Search/Filter**   | ✅      | ✅                   | ✅      | ✅       |
| **Bulk Operations** | ❌      | ❌                   | ❌      | ✅       |

---

## Implementation Phases

### Phase 1: Backend Setup (Days 1-2)

**Objective:** Implement fully functional REST API with validation, authentication, and RBAC.

#### 1.1 Create Material DTOs

**File:** `backend/src/material/material.dto.ts`

```typescript
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  MaxLength,
  IsOptional,
} from "class-validator";

export enum MaterialType {
  API = "API",
  EXCIPIENT = "Excipient",
  DIETARY_SUPPLEMENT = "Dietary Supplement",
  CONTAINER = "Container",
  CLOSURE = "Closure",
  PROCESS_CHEMICAL = "Process Chemical",
  TESTING_MATERIAL = "Testing Material",
}

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  material_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  part_number: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  material_name: string;

  @IsEnum(MaterialType)
  @IsNotEmpty()
  material_type: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  storage_conditions?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  specification_document?: string;
}

export class UpdateMaterialDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  material_name?: string;

  @IsEnum(MaterialType)
  @IsOptional()
  material_type?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  storage_conditions?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  specification_document?: string;
}

export class MaterialResponseDto {
  _id: string;
  material_id: string;
  part_number: string;
  material_name: string;
  material_type: string;
  storage_conditions?: string;
  specification_document?: string;
  created_date: Date;
  modified_date: Date;
}
```

**Dependencies:** Class Validator (already in NestJS)  
**Validation Rules:**

- `material_id`: Unique, max 20 chars, required
- `part_number`: Unique, max 20 chars, required
- `material_name`: Max 100 chars, required
- `material_type`: Must be one of the enum values
- Optional fields: max length constraints only

---

#### 1.2 Implement Material Repository

**File:** `backend/src/material/material.repository.ts` (NEW FILE)

```typescript
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Material, MaterialDocument } from "../schemas/material.schema";
import { CreateMaterialDto, UpdateMaterialDto } from "./material.dto";

@Injectable()
export class MaterialRepository {
  constructor(
    @InjectModel(Material.name)
    private readonly materialModel: Model<MaterialDocument>,
  ) {}

  async create(createDto: CreateMaterialDto): Promise<MaterialDocument> {
    const newMaterial = new this.materialModel(createDto);
    return newMaterial.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: MaterialDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const data = await this.materialModel.find().skip(skip).limit(limit).exec();
    const total = await this.materialModel.countDocuments();
    return { data, total, page, limit };
  }

  async findById(id: string): Promise<MaterialDocument | null> {
    return this.materialModel.findById(id).exec();
  }

  async findByMaterialId(materialId: string): Promise<MaterialDocument | null> {
    return this.materialModel.findOne({ material_id: materialId }).exec();
  }

  async findByPartNumber(partNumber: string): Promise<MaterialDocument | null> {
    return this.materialModel.findOne({ part_number: partNumber }).exec();
  }

  async search(
    query: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: MaterialDocument[];
    total: number;
  }> {
    const skip = (page - 1) * limit;
    const regex = new RegExp(query, "i"); // Case-insensitive regex
    const data = await this.materialModel
      .find({
        $or: [
          { material_name: regex },
          { material_id: regex },
          { part_number: regex },
        ],
      })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.materialModel.countDocuments({
      $or: [
        { material_name: regex },
        { material_id: regex },
        { part_number: regex },
      ],
    });

    return { data, total };
  }

  async filterByType(
    type: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: MaterialDocument[];
    total: number;
  }> {
    const skip = (page - 1) * limit;
    const data = await this.materialModel
      .find({ material_type: type })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.materialModel.countDocuments({
      material_type: type,
    });

    return { data, total };
  }

  async update(
    id: string,
    updateDto: UpdateMaterialDto,
  ): Promise<MaterialDocument | null> {
    return this.materialModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
  }

  async delete(id: string): Promise<MaterialDocument | null> {
    return this.materialModel.findByIdAndDelete(id).exec();
  }

  async isDuplicate(
    field: "material_id" | "part_number",
    value: string,
    excludeId?: string,
  ): Promise<boolean> {
    const query: any = { [field]: value };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const count = await this.materialModel.countDocuments(query);
    return count > 0;
  }
}
```

**Methods Provided:**

- `create()`: INSERT new material
- `findAll()`: GET all with pagination
- `findById()`: GET by MongoDB \_id
- `findByMaterialId()`: GET by material_id (business key)
- `findByPartNumber()`: GET by part_number
- `search()`: Multi-field search (name, id, part_number)
- `filterByType()`: Filter by material_type
- `update()`: UPDATE by ID
- `delete()`: DELETE by ID
- `isDuplicate()`: Check unique constraints before insert/update

---

#### 1.3 Update Material Module

**File:** `backend/src/material/material.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Material, MaterialSchema } from "../schemas/material.schema";
import { MaterialController } from "./material.controller";
import { MaterialService } from "./material.service";
import { MaterialRepository } from "./material.repository";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Material.name, schema: MaterialSchema },
    ]),
  ],
  controllers: [MaterialController],
  providers: [MaterialService, MaterialRepository],
  exports: [MaterialService],
})
export class MaterialModule {}
```

**Imports Added:**

- `MongooseModule.forFeature()`: Register Material collection with schema

---

#### 1.4 Implement Material Service

**File:** `backend/src/material/material.service.ts`

```typescript
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { MaterialRepository } from "./material.repository";
import {
  CreateMaterialDto,
  UpdateMaterialDto,
  MaterialResponseDto,
} from "./material.dto";

@Injectable()
export class MaterialService {
  constructor(private readonly repository: MaterialRepository) {}

  async create(createDto: CreateMaterialDto): Promise<MaterialResponseDto> {
    // Check for duplicate material_id
    const existingById = await this.repository.findByMaterialId(
      createDto.material_id,
    );
    if (existingById) {
      throw new ConflictException(
        `Material with ID ${createDto.material_id} already exists`,
      );
    }

    // Check for duplicate part_number
    const existingByPartNumber = await this.repository.findByPartNumber(
      createDto.part_number,
    );
    if (existingByPartNumber) {
      throw new ConflictException(
        `Part number ${createDto.part_number} already exists`,
      );
    }

    const material = await this.repository.create(createDto);
    return this.toResponseDto(material);
  }

  async findAll(page: number = 1, limit: number = 20) {
    if (page < 1 || limit < 1) {
      throw new BadRequestException("Page and limit must be >= 1");
    }
    const result = await this.repository.findAll(page, limit);
    return {
      data: result.data.map((m) => this.toResponseDto(m)),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  async findById(id: string): Promise<MaterialResponseDto> {
    const material = await this.repository.findById(id);
    if (!material) {
      throw new NotFoundException(`Material with ID ${id} not found`);
    }
    return this.toResponseDto(material);
  }

  async search(query: string, page: number = 1, limit: number = 20) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException("Search query cannot be empty");
    }
    const result = await this.repository.search(query, page, limit);
    return {
      data: result.data.map((m) => this.toResponseDto(m)),
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  async filterByType(type: string, page: number = 1, limit: number = 20) {
    const validTypes = [
      "API",
      "Excipient",
      "Dietary Supplement",
      "Container",
      "Closure",
      "Process Chemical",
      "Testing Material",
    ];

    if (!validTypes.includes(type)) {
      throw new BadRequestException(`Invalid material type: ${type}`);
    }

    const result = await this.repository.filterByType(type, page, limit);
    return {
      data: result.data.map((m) => this.toResponseDto(m)),
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  async update(
    id: string,
    updateDto: UpdateMaterialDto,
  ): Promise<MaterialResponseDto> {
    const material = await this.repository.findById(id);
    if (!material) {
      throw new NotFoundException(`Material with ID ${id} not found`);
    }

    const updated = await this.repository.update(id, updateDto);
    return this.toResponseDto(updated);
  }

  async delete(id: string): Promise<{ message: string }> {
    const material = await this.repository.findById(id);
    if (!material) {
      throw new NotFoundException(`Material with ID ${id} not found`);
    }

    await this.repository.delete(id);
    return { message: `Material ${id} deleted successfully` };
  }

  private toResponseDto(material: any): MaterialResponseDto {
    return {
      _id: material._id.toString(),
      material_id: material.material_id,
      part_number: material.part_number,
      material_name: material.material_name,
      material_type: material.material_type,
      storage_conditions: material.storage_conditions,
      specification_document: material.specification_document,
      created_date: material.created_date,
      modified_date: material.modified_date,
    };
  }
}
```

**Business Logic Implemented:**

- Unique constraint validation (material_id, part_number)
- Error handling (ConflictException, NotFoundException, BadRequestException)
- Search and filter with pagination
- DTO transformation (toResponseDto)

---

#### 1.5 Implement Material Controller

**File:** `backend/src/material/material.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { MaterialService } from "./material.service";
import { CreateMaterialDto, UpdateMaterialDto } from "./material.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("materials")
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialController {
  constructor(private readonly service: MaterialService) {}

  /**
   * GET /materials
   * List all materials with pagination
   * Accessible by: All authenticated users
   */
  @Get()
  async findAll(
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "20",
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    return this.service.findAll(pageNum, limitNum);
  }

  /**
   * GET /materials/search?q=vitamin
   * Search materials by name, material_id, or part_number
   * Accessible by: All authenticated users
   */
  @Get("search")
  async search(
    @Query("q") query: string,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "20",
  ) {
    if (!query) {
      throw new BadRequestException("Search query (q) is required");
    }
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    return this.service.search(query, pageNum, limitNum);
  }

  /**
   * GET /materials/type/:type
   * Filter materials by type
   * Accessible by: All authenticated users
   */
  @Get("type/:type")
  async filterByType(
    @Param("type") type: string,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "20",
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    return this.service.filterByType(type, pageNum, limitNum);
  }

  /**
   * GET /materials/:id
   * Get single material by ID
   * Accessible by: All authenticated users
   */
  @Get(":id")
  async findById(@Param("id") id: string) {
    return this.service.findById(id);
  }

  /**
   * POST /materials
   * Create new material
   * Accessible by: Manager, Operator, IT Administrator
   */
  @Post()
  @Roles("Manager", "Operator", "IT_Administrator")
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateMaterialDto) {
    return this.service.create(createDto);
  }

  /**
   * PUT /materials/:id
   * Update material
   * Accessible by: Manager, IT Administrator
   * Operator can update limited fields only
   */
  @Put(":id")
  @Roles("Manager", "IT_Administrator")
  async update(@Param("id") id: string, @Body() updateDto: UpdateMaterialDto) {
    return this.service.update(id, updateDto);
  }

  /**
   * DELETE /materials/:id
   * Delete material (soft delete recommended)
   * Accessible by: IT Administrator only
   */
  @Delete(":id")
  @Roles("IT_Administrator")
  @HttpCode(HttpStatus.OK)
  async remove(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
```

**Endpoints Provided:**
| Method | Path | Roles | Purpose |
|--------|------|-------|---------|
| GET | `/materials` | All | List all with pagination |
| GET | `/materials/search?q=` | All | Search multi-field |
| GET | `/materials/type/:type` | All | Filter by type |
| GET | `/materials/:id` | All | Get single detail |
| POST | `/materials` | Manager, Operator, IT Admin | Create new |
| PUT | `/materials/:id` | Manager, IT Admin | Update |
| DELETE | `/materials/:id` | IT Admin only | Delete |

---

#### 1.6 Setup MongoDB Indexes

**File:** `backend/src/schemas/material.schema.ts` (Modify existing)

```typescript
export const MaterialSchema = SchemaFactory.createForClass(Material);

// Create indexes for fast queries
MaterialSchema.index({ material_id: 1 }, { unique: true });
MaterialSchema.index({ part_number: 1 }, { unique: true });
MaterialSchema.index({ material_name: "text" }); // For text search
MaterialSchema.index({ material_type: 1 }); // For filtering
MaterialSchema.index({ created_date: -1 }); // For sorting by date
```

---

### Phase 2: Frontend Setup (Days 2-3, _parallel with Phase 1_)

#### 2.1 Create Material API Service

**File:** `frontend/src/services/materialService.ts` (NEW FILE)

```typescript
import axios, { AxiosError } from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3000/api";
const MATERIALS_ENDPOINT = `${API_BASE_URL}/materials`;

interface PaginationParams {
  page?: number;
  limit?: number;
}

interface SearchParams extends PaginationParams {
  q: string;
}

interface FilterParams extends PaginationParams {
  type: string;
}

interface Material {
  _id: string;
  material_id: string;
  part_number: string;
  material_name: string;
  material_type: string;
  storage_conditions?: string;
  specification_document?: string;
  created_date: string;
  modified_date: string;
}

interface CreateMaterialPayload {
  material_id: string;
  part_number: string;
  material_name: string;
  material_type: string;
  storage_conditions?: string;
  specification_document?: string;
}

interface UpdateMaterialPayload {
  material_name?: string;
  material_type?: string;
  storage_conditions?: string;
  specification_document?: string;
}

interface ApiResponse<T> {
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class MaterialService {
  private getAuthHeader() {
    const token = localStorage.getItem("access_token");
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };
  }

  async getMaterials(
    params: PaginationParams = { page: 1, limit: 20 },
  ): Promise<ApiResponse<Material[]>> {
    try {
      const response = await axios.get<ApiResponse<Material[]>>(
        MATERIALS_ENDPOINT,
        {
          params,
          ...this.getAuthHeader(),
        },
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMaterialById(id: string): Promise<Material> {
    try {
      const response = await axios.get<Material>(
        `${MATERIALS_ENDPOINT}/${id}`,
        this.getAuthHeader(),
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async searchMaterials(
    params: SearchParams,
  ): Promise<ApiResponse<Material[]>> {
    try {
      const response = await axios.get<ApiResponse<Material[]>>(
        `${MATERIALS_ENDPOINT}/search`,
        {
          params,
          ...this.getAuthHeader(),
        },
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async filterByType(params: FilterParams): Promise<ApiResponse<Material[]>> {
    try {
      const response = await axios.get<ApiResponse<Material[]>>(
        `${MATERIALS_ENDPOINT}/type/${params.type}`,
        {
          params: { page: params.page, limit: params.limit },
          ...this.getAuthHeader(),
        },
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createMaterial(payload: CreateMaterialPayload): Promise<Material> {
    try {
      const response = await axios.post<Material>(
        MATERIALS_ENDPOINT,
        payload,
        this.getAuthHeader(),
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateMaterial(
    id: string,
    payload: UpdateMaterialPayload,
  ): Promise<Material> {
    try {
      const response = await axios.put<Material>(
        `${MATERIALS_ENDPOINT}/${id}`,
        payload,
        this.getAuthHeader(),
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteMaterial(id: string): Promise<{ message: string }> {
    try {
      const response = await axios.delete<{ message: string }>(
        `${MATERIALS_ENDPOINT}/${id}`,
        this.getAuthHeader(),
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const message =
        (axiosError.response?.data as any)?.message ||
        axiosError.message ||
        "An error occurred";
      return new Error(message);
    }
    return error;
  }
}

export default new MaterialService();
```

**Methods Provided:**

- `getMaterials()`: Fetch paginated list
- `getMaterialById()`: Fetch single detail
- `searchMaterials()`: Multi-field search
- `filterByType()`: Filter by type
- `createMaterial()`: Create new
- `updateMaterial()`: Update existing
- `deleteMaterial()`: Delete by ID
- `getAuthHeader()`: JWT token management

---

#### 2.2 Create Custom Hooks

**File:** `frontend/src/hooks/useMaterial.ts` (NEW FILE)

```typescript
import { useState, useCallback, useEffect } from "react";
import useSWR from "swr";
import materialService from "../services/materialService";

export interface Material {
  _id: string;
  material_id: string;
  part_number: string;
  material_name: string;
  material_type: string;
  storage_conditions?: string;
  specification_document?: string;
  created_date: string;
  modified_date: string;
}

interface UseResultState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook: useMaterialList
 * Fetch and cache material list with pagination
 */
export function useMaterialList(page = 1, limit = 20) {
  const { data, error, isLoading, mutate } = useSWR(
    ["materials", page, limit],
    () => materialService.getMaterials({ page, limit }),
  );

  return {
    materials: data?.data || [],
    pagination: data?.pagination,
    loading: isLoading,
    error: error?.message || null,
    refetch: mutate,
  };
}

/**
 * Hook: useMaterialDetail
 * Fetch single material by ID
 */
export function useMaterialDetail(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? ["material", id] : null,
    () => materialService.getMaterialById(id!),
  );

  return {
    material: data || null,
    loading: isLoading,
    error: error?.message || null,
    refetch: mutate,
  };
}

/**
 * Hook: useMaterialSearch
 * Search materials with debounce
 */
export function useMaterialSearch(query: string, enableSearch = true) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [query]);

  const { data, error, isLoading, mutate } = useSWR(
    enableSearch && debouncedQuery ? ["search", debouncedQuery] : null,
    () => materialService.searchMaterials({ q: debouncedQuery }),
  );

  return {
    results: data?.data || [],
    loading: isLoading,
    error: error?.message || null,
    refetch: mutate,
  };
}

/**
 * Hook: useMaterialForm
 * Handle form state for create/update
 */
export function useMaterialForm(
  onSuccess?: (material: Material) => void,
  onError?: (error: Error) => void,
) {
  const [state, setState] = useState<UseResultState<Material>>({
    data: null,
    loading: false,
    error: null,
  });

  const createMaterial = useCallback(
    async (payload: any) => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = await materialService.createMaterial(payload);
        setState({ data: result, loading: false, error: null });
        onSuccess?.(result);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState({ data: null, loading: false, error: err });
        onError?.(err);
        throw err;
      }
    },
    [onSuccess, onError],
  );

  const updateMaterial = useCallback(
    async (id: string, payload: any) => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = await materialService.updateMaterial(id, payload);
        setState({ data: result, loading: false, error: null });
        onSuccess?.(result);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState({ data: null, loading: false, error: err });
        onError?.(err);
        throw err;
      }
    },
    [onSuccess, onError],
  );

  const deleteMaterial = useCallback(
    async (id: string) => {
      setState({ data: null, loading: true, error: null });
      try {
        await materialService.deleteMaterial(id);
        setState({ data: null, loading: false, error: null });
        onSuccess?.(null as any);
        return true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState({ data: null, loading: false, error: err });
        onError?.(err);
        throw err;
      }
    },
    [onSuccess, onError],
  );

  return {
    ...state,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    reset: () => setState({ data: null, loading: false, error: null }),
  };
}

/**
 * Hook: useMaterialFilter
 * Filter materials by type
 */
export function useMaterialFilter(materialType: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    materialType ? ["materials", "filter", materialType] : null,
    () => materialService.filterByType({ type: materialType! }),
  );

  return {
    materials: data?.data || [],
    pagination: data?.pagination,
    loading: isLoading,
    error: error?.message || null,
    refetch: mutate,
  };
}
```

---

#### 2.3 Create Material Components

**File 1:** `frontend/src/components/Material/MaterialList.tsx`

```typescript
import React, { useState } from 'react';
import { useMaterialList } from '../../hooks/useMaterial';
import { Material } from '../../types/Material';
import styles from './MaterialList.module.css';

interface Props {
  onEdit?: (material: Material) => void;
  onDelete?: (materialId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export const MaterialList: React.FC<Props> = ({
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}) => {
  const [page, setPage] = useState(1);
  const { materials, pagination, loading, error } = useMaterialList(page, 20);

  if (loading) return <div className={styles.loading}>Loading materials...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Material ID</th>
            <th>Part Number</th>
            <th>Material Name</th>
            <th>Type</th>
            <th>Storage Conditions</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((material) => (
            <tr key={material._id}>
              <td>{material.material_id}</td>
              <td>{material.part_number}</td>
              <td>{material.material_name}</td>
              <td>{material.material_type}</td>
              <td>{material.storage_conditions || '-'}</td>
              <td>
                {canEdit && (
                  <button
                    className={styles.editBtn}
                    onClick={() => onEdit?.(material)}
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    className={styles.deleteBtn}
                    onClick={() => onDelete?.(material._id)}
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {pagination && (
        <div className={styles.pagination}>
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {pagination.totalPages} (Total: {pagination.total})
          </span>
          <button
            disabled={page === pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
```

**File 2:** `frontend/src/components/Material/MaterialForm.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Material } from '../../types/Material';
import styles from './MaterialForm.module.css';

interface Props {
  material?: Material;
  onSubmit: (data: Partial<Material>) => Promise<void>;
  loading?: boolean;
}

const MATERIAL_TYPES = [
  'API',
  'Excipient',
  'Dietary Supplement',
  'Container',
  'Closure',
  'Process Chemical',
  'Testing Material',
];

export const MaterialForm: React.FC<Props> = ({
  material,
  onSubmit,
  loading = false,
}) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: material || {},
  });

  useEffect(() => {
    if (material) {
      reset(material);
    }
  }, [material, reset]);

  const onFormSubmit = async (data: any) => {
    try {
      await onSubmit(data);
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="material_id">Material ID *</label>
        <input
          id="material_id"
          placeholder="MAT-001"
          disabled={!!material} // Disable if editing
          {...register('material_id', {
            required: 'Material ID is required',
            maxLength: { value: 20, message: 'Max 20 characters' },
          })}
        />
        {errors.material_id && (
          <span className={styles.error}>{errors.material_id.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="part_number">Part Number *</label>
        <input
          id="part_number"
          placeholder="PART-12345"
          disabled={!!material}
          {...register('part_number', {
            required: 'Part Number is required',
            maxLength: { value: 20, message: 'Max 20 characters' },
          })}
        />
        {errors.part_number && (
          <span className={styles.error}>{errors.part_number.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="material_name">Material Name *</label>
        <input
          id="material_name"
          placeholder="Ascorbic Acid"
          {...register('material_name', {
            required: 'Material Name is required',
            maxLength: { value: 100, message: 'Max 100 characters' },
          })}
        />
        {errors.material_name && (
          <span className={styles.error}>{errors.material_name.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="material_type">Material Type *</label>
        <select
          id="material_type"
          {...register('material_type', {
            required: 'Material Type is required',
          })}
        >
          <option value="">Select a type</option>
          {MATERIAL_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {errors.material_type && (
          <span className={styles.error}>{errors.material_type.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="storage_conditions">Storage Conditions</label>
        <input
          id="storage_conditions"
          placeholder="2-8°C, protected from light"
          maxLength={100}
          {...register('storage_conditions')}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="specification_document">Specification Document</label>
        <input
          id="specification_document"
          placeholder="SPEC-VC-001"
          maxLength={50}
          {...register('specification_document')}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={styles.submitBtn}
      >
        {loading ? 'Saving...' : material ? 'Update' : 'Create'}
      </button>
    </form>
  );
};
```

**File 3:** `frontend/src/components/Material/MaterialSearch.tsx`

```typescript
import React, { useState } from 'react';
import { useMaterialSearch } from '../../hooks/useMaterial';
import styles from './MaterialSearch.module.css';

interface Props {
  onSelectMaterial?: (id: string) => void;
}

export const MaterialSearch: React.FC<Props> = ({ onSelectMaterial }) => {
  const [query, setQuery] = useState('');
  const { results, loading } = useMaterialSearch(query, query.length > 0);

  return (
    <div className={styles.container}>
      <input
        type="text"
        placeholder="Search by name, ID, or part number..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={styles.input}
      />

      {loading && <div className={styles.loading}>Searching...</div>}

      {query && results.length > 0 && (
        <ul className={styles.results}>
          {results.map((material) => (
            <li key={material._id}>
              <div
                className={styles.result}
                onClick={() => onSelectMaterial?.(material._id)}
              >
                <strong>{material.material_name}</strong>
                <small>{material.material_id} - {material.part_number}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

---

#### 2.4 Update Material Pages

**File:** `frontend/src/pages/manager/MaterialManagement.tsx`

```typescript
import React, { useState } from 'react';
import { MaterialList } from '../../components/Material/MaterialList';
import { MaterialForm } from '../../components/Material/MaterialForm';
import { MaterialSearch } from '../../components/Material/MaterialSearch';
import { useMaterialForm, useMaterialDetail } from '../../hooks/useMaterial';
import { Material } from '../../types/Material';
import styles from './MaterialManagement.module.css';

export const MaterialManagementPage: React.FC = () => {
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { material: materialDetail } = useMaterialDetail(
    selectedMaterial?._id || null
  );
  const {
    createMaterial,
    updateMaterial,
    deleteMaterial,
    loading,
    error,
  } = useMaterialForm(
    () => {
      setShowForm(false);
      setSelectedMaterial(null);
    },
    (err) => alert(`Error: ${err.message}`)
  );

  const handleFormSubmit = async (data: Partial<Material>) => {
    if (materialDetail) {
      await updateMaterial(materialDetail._id, data);
    } else {
      await createMaterial(data as any);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      await deleteMaterial(id);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Material Management</h1>

      {/* Search Bar */}
      <MaterialSearch onSelectMaterial={(id) => setSelectedMaterial({ ...selectedMaterial, _id: id } as any)} />

      {/* Material List */}
      <MaterialList
        onEdit={(m) => {
          setSelectedMaterial(m);
          setShowForm(true);
        }}
        onDelete={handleDelete}
        canEdit={true}
        canDelete={false} // Manager cannot delete
      />

      {/* Create/Edit Form */}
      {showForm && (
        <div className={styles.formContainer}>
          <h2>{selectedMaterial ? 'Edit Material' : 'Create Material'}</h2>
          <MaterialForm
            material={selectedMaterial || undefined}
            onSubmit={handleFormSubmit}
            loading={loading}
          />
          {error && <div className={styles.error}>{error.message}</div>}
          <button onClick={() => setShowForm(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
};

export default MaterialManagementPage;
```

---

### Phase 3: Integration & Testing (Days 4-5)

#### 3.1 Backend API Tests

Create test file: `backend/src/material/material.controller.spec.ts`

**Test Cases:**

- ✅ GET /materials returns list with pagination
- ✅ GET /materials/:id returns single material
- ✅ POST /materials creates new material (only for authorized roles)
- ✅ POST /materials rejects duplicate material_id
- ✅ PUT /materials/:id updates material (Manager/IT_Admin only)
- ✅ DELETE /materials/:id deletes material (IT_Admin only)
- ✅ GET /materials/search?q= returns search results
- ✅ GET /materials/type/:type filters by type

#### 3.2 Frontend Component Tests

Create test file: `frontend/src/components/Material/__tests__/MaterialForm.test.tsx`

**Test Cases:**

- ✅ MaterialForm renders with input fields
- ✅ Form submits with valid data
- ✅ Form shows validation errors for missing required fields
- ✅ Edit mode pre-populates form fields
- ✅ MaterialList renders table with materials
- ✅ MaterialSearch debounces queries
- ✅ Search results display correctly

---

### Phase 4: Polish & Documentation (Days 5-7)

#### 4.1 Error Handling

- Network errors: Retry logic with exponential backoff
- Validation errors: Display field-specific error messages
- Permission errors: Show "You don't have permission" message
- Duplicate key errors: Show "This ID/Part Number already exists"

#### 4.2 Performance

- Implement API response caching with SWR stale-while-revalidate
- Virtual scrolling for large material lists (>1000 items)
- Debounce search queries (500ms)

#### 4.3 Documentation

- Swagger/OpenAPI: `npm run swagger` generates API docs
- Storybook: Component showcase (optional)
- README: How to run, test, deploy

---

## Dependencies & Prerequisites

### Backend Dependencies

```json
{
  "@nestjs/common": "^10.x",
  "@nestjs/mongoose": "^10.x",
  "mongoose": "^8.x",
  "class-validator": "^0.14.x",
  "class-transformer": "^0.5.x"
}
```

### Frontend Dependencies

```json
{
  "react": "^18.x",
  "react-router-dom": "^6.x",
  "swr": "^2.x",
  "react-hook-form": "^7.x",
  "axios": "^1.x"
}
```

### Prerequisites

- ✅ MongoDB is running and accessible
- ✅ Keycloak auth service is configured
- ✅ JWT auth guards/decorators already exist
- ⚠️ RolesGuard needs to be implemented if missing

---

## Risk Mitigation

| Risk                         | Probability | Impact | Mitigation                                           |
| ---------------------------- | ----------- | ------ | ---------------------------------------------------- |
| JWT token invalid/expired    | Medium      | High   | Implement token refresh logic, handle 401 gracefully |
| MongoDB connection timeout   | Low         | High   | Retry logic, health check endpoint                   |
| RBAC not enforced            | Medium      | High   | Unit test all role-based endpoints                   |
| Duplicate key errors         | High        | Medium | Validate before submit, handle ConflictException     |
| Large dataset slow queries   | Medium      | Medium | Index optimization, pagination, lazy loading         |
| Frontend state inconsistency | Medium      | Medium | Use SWR for automatic cache invalidation             |

---

## Verification Checklist

### Backend ✅

- [ ] MaterialDTO validation working
- [ ] MaterialRepository CRUD methods implemented
- [ ] MaterialService business logic correct
- [ ] MaterialController endpoints accessible
- [ ] MongoDB indexes created
- [ ] JWT auth guards enforced
- [ ] RBAC permissions tested (all 4 roles)
- [ ] API response format consistent
- [ ] Error handling comprehensive
- [ ] Pagination working (page < 1 validation)
- [ ] Search results accurate (multi-field)
- [ ] Unique constraints enforced (material_id, part_number)

### Frontend ✅

- [ ] MaterialService API client working
- [ ] useMaterialList hook loads data
- [ ] useMaterialForm hook handles CRUD
- [ ] useMaterialSearch hook debounces
- [ ] MaterialList component renders
- [ ] MaterialForm component validates
- [ ] MaterialSearch component filters
- [ ] Manager page shows all buttons
- [ ] Operator page hides delete button
- [ ] QC Tech page read-only
- [ ] Error messages display correctly
- [ ] Loading states show during requests

### Integration ✅

- [ ] Backend & frontend API communication working
- [ ] CRUD workflow end-to-end (create → read → update → delete)
- [ ] Search results match backend
- [ ] Pagination works across all pages
- [ ] Role-based visibility correct on UI
- [ ] Auth token sent in all requests
- [ ] Duplicate key errors handled gracefully

---

## Timeline Summary

| Phase                    | Duration    | Deliverable                              |
| ------------------------ | ----------- | ---------------------------------------- |
| **Phase 1: Backend**     | Days 1-2    | REST API with CRUD, search, RBAC         |
| **Phase 2: Frontend**    | Days 2-3    | Components, pages, API service, hooks    |
| **Phase 3: Integration** | Days 4-5    | E2E tests, role-based flows              |
| **Phase 4: Polish**      | Days 5-7    | Docs, optimization, edge cases           |
| **Total**                | **~7 days** | **Production-ready Material Management** |

---

## Next Steps

1. **Approve this plan** - Any modifications needed?
2. **Start Phase 1** - I can implement backend in parallel with Phase 2
3. **Setup test data** - Create sample materials in MongoDB for testing
4. **E2E testing** - Test as Material Manager role once everything deployed

**Ready to implement?** Let me know if you'd like me to start with any specific phase! 🚀
