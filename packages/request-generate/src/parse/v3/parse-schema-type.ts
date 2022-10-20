import type { OpenAPIV3 } from 'openapi-types'
import type { SchemaType } from '../../types/schema-type'
import { getMappedType } from '../../utils/get-mapped-type'
import { stripNamespace } from './strip-namespace'

export function parseSchemaType(
  schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject
): SchemaType {
  // ReferenceObject类型
  if ('$ref' in schema) {
    // 获取引用类型
    const ref = stripNamespace(schema.$ref)

    return {
      type: 'any',
      ref,
      imports: [ref]
    }
  }

  // NonArraySchemaObjectType类型
  if (
    !('$ref' in schema) &&
    schema.type !== 'array' &&
    !schema.allOf &&
    !schema.anyOf &&
    !schema.oneOf
  ) {
    return {
      type: getMappedType(schema.type || 'any'),
      ref: undefined
    }
  }

  // ArrayReferenceObject类型
  if (schema.type === 'array' && '$ref' in schema.items) {
    // 获取引用类型
    const ref = stripNamespace(schema.items.$ref)

    return {
      type: 'any[]',
      ref: `${ref}[]`,
      imports: [ref]
    }
  }

  // ArraySchemaObject类型
  if (schema.type === 'array' && !('$ref' in schema.items)) {
    return {
      type: `${getMappedType(schema.items.type)}[]`,
      ref: undefined
    }
  }

  // AllOf|AnyOf|OneOf类型
  if (schema.allOf || schema.anyOf || schema.oneOf) {
    const ofSchema = schema.allOf || schema.anyOf || schema.oneOf

    const ofSchemaArray = ofSchema?.map((s) => parseSchemaType(s))

    if (ofSchemaArray) {
      const hasRef = ofSchemaArray.some((s) => s.ref)

      return {
        type: hasRef ? 'any' : ofSchemaArray.map((s) => s.type).join('|'),
        ref: hasRef
          ? ofSchemaArray.map((s) => s.ref || s.type).join('|')
          : undefined,
        imports: hasRef
          ? ofSchemaArray.reduce<string[]>(
              (r, s) => (s.ref && !r.includes(s.ref) && r.push(s.ref), r),
              []
            )
          : undefined
      }
    }
  }

  throw new Error('无法解析相应的schema')
}
