import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListQueryDto } from 'utils/common/pagination/list-query.dto';
import { multerStorage } from 'config/multer.config';
import { Roles } from 'utils/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { Public } from 'utils/decorators/public.decorator';
import { DocsResponse } from 'utils/decorators/docs-response.decorator';
import { DocsErrors } from 'utils/decorators/docs-errors.decorator';
import { ApiPaginated } from 'utils/decorators/docs-paginated.decorator';
import { Product } from './entities/product.entity';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('images', 10, { storage: multerStorage('products') }),
  )
  @ApiConsumes('multipart/form-data')
  @DocsResponse('Product created successfully', Product, { status: 201 })
  @DocsErrors(
    400,
    { code: 401, description: 'Missing or invalid access token' },
    { code: 403, description: 'Admin role required' },
    { code: 404, description: 'Category not found' },
  )
  create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productsService.create(createProductDto, files);
  }

  @Public()
  @Get()
  @ApiPaginated(Product)
  @DocsErrors({ code: 400, description: 'Invalid filter or ordering field' })
  findAll(@Query() query: ListQueryDto) {
    return this.productsService.findAll(query);
  }

  @Public()
  @Get(':id')
  @DocsResponse('Product fetched successfully', Product)
  @DocsErrors({ code: 404, description: 'Product not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FilesInterceptor('images', 10, { storage: multerStorage('products') }),
  )
  @ApiConsumes('multipart/form-data')
  @DocsResponse('Product updated successfully', Product)
  @DocsErrors(
    400,
    { code: 401, description: 'Missing or invalid access token' },
    { code: 403, description: 'Admin role required' },
    { code: 404, description: 'Product not found' },
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.productsService.update(id, updateProductDto, files);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @DocsResponse('Product deleted successfully', Product)
  @DocsErrors(
    { code: 401, description: 'Missing or invalid access token' },
    { code: 403, description: 'Admin role required' },
    { code: 404, description: 'Product not found' },
  )
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }

  @Patch(':id/recover')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @DocsResponse('Product recovered successfully', Product)
  @DocsErrors(
    { code: 400, description: 'Product is not deleted' },
    { code: 401, description: 'Missing or invalid access token' },
    { code: 403, description: 'Admin role required' },
    { code: 404, description: 'Product not found' },
  )
  recover(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.restore(id);
  }

  @Delete(':id/images/:imageId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @DocsResponse('Image removed successfully', Product)
  @DocsErrors(
    { code: 400, description: 'Cannot delete the last image' },
    { code: 401, description: 'Missing or invalid access token' },
    { code: 403, description: 'Admin role required' },
    { code: 404, description: 'Product or image not found' },
  )
  removeImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    return this.productsService.removeImage(id, imageId);
  }
}
